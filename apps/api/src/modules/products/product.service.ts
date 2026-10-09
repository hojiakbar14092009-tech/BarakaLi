import { randomUUID } from 'node:crypto';
import {
  MAX_PRODUCT_IMAGES,
  MODEL_MIME_TYPE,
  type ProductDto,
  type ProductInput,
  type ProductStatus,
} from '@barakali/shared';
import type { AppContext } from '../../context.js';
import { AppError } from '../../errors.js';
import { validateGlb } from '../uploads/glb.js';
import { processImage } from '../uploads/image.js';
import { ProductRepository } from './product.repository.js';

export class ProductService {
  private readonly repo: ProductRepository;

  constructor(private readonly ctx: AppContext) {
    this.repo = new ProductRepository(ctx.db);
  }

  async listMine(workerId: string): Promise<ProductDto[]> {
    return this.repo.findDtosByIds(await this.repo.listIdsByWorker(workerId));
  }

  async create(workerId: string, input: ProductInput): Promise<ProductDto> {
    await this.assertCategory(input.categoryId);
    const id = await this.repo.create(workerId, { ...input, status: 'draft' });
    this.ctx.cache.delete('workers:featured');
    return this.get(id);
  }

  async update(workerId: string, id: string, input: ProductInput): Promise<ProductDto> {
    await this.assertOwner(workerId, id);
    await this.assertCategory(input.categoryId);
    if (input.status === 'published') await this.assertHasImage(id);
    await this.repo.update(id, input);
    this.ctx.cache.delete('workers:featured');
    return this.get(id);
  }

  async setStock(workerId: string, id: string, stock: number): Promise<ProductDto> {
    await this.assertOwner(workerId, id);
    await this.repo.setStock(id, stock);
    return this.get(id);
  }

  async setStatus(workerId: string, id: string, status: ProductStatus): Promise<ProductDto> {
    await this.assertOwner(workerId, id);
    if (status === 'published') await this.assertHasImage(id);
    await this.repo.setStatus(id, status);
    this.ctx.cache.delete('workers:featured');
    return this.get(id);
  }

  async remove(workerId: string, id: string): Promise<void> {
    await this.assertOwner(workerId, id);
    const [images, modelUrl] = await Promise.all([
      this.repo.listImages(id),
      this.repo.getModelUrl(id),
    ]);
    await this.repo.delete(id);
    await Promise.all(
      [...images.map((image) => image.url), ...(modelUrl ? [modelUrl] : [])].map((url) =>
        this.ctx.storage.delete(url),
      ),
    );
    this.ctx.cache.delete('workers:featured');
  }

  async addImage(workerId: string, id: string, file: Buffer): Promise<ProductDto> {
    await this.assertOwner(workerId, id);
    const existing = await this.repo.listImages(id);
    if (existing.length >= MAX_PRODUCT_IMAGES) throw AppError.conflict('IMAGE_LIMIT_REACHED');
    const webp = await processImage(file);
    const url = await this.ctx.storage.put(`${randomUUID()}.webp`, webp, 'image/webp');
    await this.repo.addImage(id, url, existing.length);
    return this.get(id);
  }

  async removeImage(workerId: string, id: string, imageId: string): Promise<ProductDto> {
    await this.assertOwner(workerId, id);
    const url = await this.repo.removeImage(id, imageId);
    if (!url) throw AppError.notFound();
    await this.ctx.storage.delete(url);
    return this.get(id);
  }

  async setModel(workerId: string, id: string, file: Buffer): Promise<ProductDto> {
    await this.assertOwner(workerId, id);
    await validateGlb(file);
    const previous = await this.repo.getModelUrl(id);
    const url = await this.ctx.storage.put(`${randomUUID()}.glb`, file, MODEL_MIME_TYPE);
    const poster = (await this.repo.listImages(id))[0]?.url ?? null;
    await this.repo.upsertModel(id, url, file.length, poster);
    if (previous) await this.ctx.storage.delete(previous);
    return this.get(id);
  }

  async removeModel(workerId: string, id: string): Promise<ProductDto> {
    await this.assertOwner(workerId, id);
    const url = await this.repo.getModelUrl(id);
    await this.repo.removeModel(id);
    if (url) await this.ctx.storage.delete(url);
    return this.get(id);
  }

  async get(id: string): Promise<ProductDto> {
    const [product] = await this.repo.findDtosByIds([id]);
    if (!product) throw AppError.notFound('PRODUCT_NOT_FOUND');
    return product;
  }

  private async assertOwner(workerId: string, id: string): Promise<void> {
    const ownership = await this.repo.findOwnership(id);
    if (!ownership) throw AppError.notFound('PRODUCT_NOT_FOUND');
    if (ownership.workerId !== workerId) throw AppError.forbidden();
  }

  private async assertCategory(categoryId: string): Promise<void> {
    if (!(await this.repo.categoryExists(categoryId))) {
      throw AppError.validation({ categoryId: ['NOT_FOUND'] });
    }
  }

  private async assertHasImage(id: string): Promise<void> {
    if ((await this.repo.listImages(id)).length === 0) {
      throw AppError.validation({ images: ['IMAGE_REQUIRED'] });
    }
  }
}
