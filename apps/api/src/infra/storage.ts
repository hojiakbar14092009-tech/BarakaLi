import type { Db } from '../db/client.js';

export interface StoredFile {
  contentType: string;
  data: Buffer;
}

/** File storage port. Current adapter keeps bytes in PostgreSQL; an S3-compatible one can replace it. */
export interface StorageProvider {
  put(name: string, data: Buffer, contentType: string): Promise<string>;
  get(name: string): Promise<StoredFile | undefined>;
  delete(url: string): Promise<void>;
}

export const FILES_URL_PREFIX = '/api/files/';

export class DbStorageProvider implements StorageProvider {
  constructor(private readonly db: Db) {}

  async put(name: string, data: Buffer, contentType: string): Promise<string> {
    await this.db
      .insertInto('files')
      .values({ name, content_type: contentType, size: data.length, data })
      .execute();
    return `${FILES_URL_PREFIX}${name}`;
  }

  async get(name: string): Promise<StoredFile | undefined> {
    const row = await this.db
      .selectFrom('files')
      .select(['content_type', 'data'])
      .where('name', '=', name)
      .executeTakeFirst();
    if (!row) return undefined;
    return { contentType: row.content_type, data: Buffer.from(row.data) };
  }

  async delete(url: string): Promise<void> {
    if (!url.startsWith(FILES_URL_PREFIX)) return;
    await this.db
      .deleteFrom('files')
      .where('name', '=', url.slice(FILES_URL_PREFIX.length))
      .execute();
  }
}
