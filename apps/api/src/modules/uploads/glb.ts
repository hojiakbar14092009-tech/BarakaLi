import { NodeIO } from '@gltf-transform/core';
import {
  ALLOWED_MODEL_EXTENSIONS,
  MAX_MODEL_BYTES,
  MAX_MODEL_TEXTURE_SIZE,
  MAX_MODEL_TRIANGLES,
} from '@barakali/shared';
import { AppError } from '../../errors.js';

const GLB_MAGIC = 0x46546c67; // "glTF"
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;
const HEADER_BYTES = 12;
const CHUNK_HEADER_BYTES = 8;
const COMPRESSION_EXTENSIONS = ['KHR_draco_mesh_compression', 'EXT_meshopt_compression'];
const EMBEDDED_IMAGE_MIME = ['image/png', 'image/jpeg'];
const MODE_TRIANGLES = 4;
const MODE_STRIP = 5;
const MODE_FAN = 6;

interface GltfJson {
  asset?: { version?: string };
  extensionsUsed?: string[];
  extensionsRequired?: string[];
  buffers?: { uri?: string }[];
  images?: { uri?: string; bufferView?: number; mimeType?: string }[];
  bufferViews?: { byteOffset?: number; byteLength: number }[];
  accessors?: { count: number }[];
  meshes?: {
    primitives: { mode?: number; indices?: number; attributes: Record<string, number> }[];
  }[];
}

interface ParsedGlb {
  json: GltfJson;
  bin: Buffer | undefined;
}

const invalidContent = () => new AppError('MODEL_INVALID_CONTENT', 400);

function parseContainer(buffer: Buffer): ParsedGlb {
  if (buffer.length < HEADER_BYTES + CHUNK_HEADER_BYTES)
    throw new AppError('MODEL_INVALID_FORMAT', 400);
  if (buffer.readUInt32LE(0) !== GLB_MAGIC) throw new AppError('MODEL_INVALID_FORMAT', 400);
  if (buffer.readUInt32LE(4) !== 2) throw new AppError('MODEL_INVALID_FORMAT', 400);
  if (buffer.readUInt32LE(8) !== buffer.length) throw invalidContent();
  const jsonLength = buffer.readUInt32LE(HEADER_BYTES);
  const jsonStart = HEADER_BYTES + CHUNK_HEADER_BYTES;
  if (
    buffer.readUInt32LE(HEADER_BYTES + 4) !== CHUNK_JSON ||
    jsonStart + jsonLength > buffer.length
  ) {
    throw invalidContent();
  }
  let json: GltfJson;
  try {
    json = JSON.parse(
      buffer.subarray(jsonStart, jsonStart + jsonLength).toString('utf8'),
    ) as GltfJson;
  } catch {
    throw invalidContent();
  }
  return { json, bin: readBinChunk(buffer, jsonStart + jsonLength) };
}

function readBinChunk(buffer: Buffer, offset: number): Buffer | undefined {
  if (offset + CHUNK_HEADER_BYTES > buffer.length) return undefined;
  const length = buffer.readUInt32LE(offset);
  if (buffer.readUInt32LE(offset + 4) !== CHUNK_BIN) return undefined;
  const start = offset + CHUNK_HEADER_BYTES;
  if (start + length > buffer.length) throw invalidContent();
  return buffer.subarray(start, start + length);
}

function assertSelfContained(json: GltfJson): void {
  if (!json.asset?.version?.startsWith('2')) throw new AppError('MODEL_INVALID_FORMAT', 400);
  const external = [...(json.buffers ?? []), ...(json.images ?? [])].some(
    (item) => item.uri !== undefined,
  );
  if (external) throw invalidContent();
}

function assertAllowedExtensions(json: GltfJson): void {
  const declared = [...(json.extensionsUsed ?? []), ...(json.extensionsRequired ?? [])];
  const allowed = declared.every((name) =>
    ALLOWED_MODEL_EXTENSIONS.some((rule) =>
      rule.endsWith('_') ? name.startsWith(rule) : name === rule,
    ),
  );
  if (!allowed) throw invalidContent();
}

function countTriangles(json: GltfJson): number {
  const accessors = json.accessors ?? [];
  let total = 0;
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives) {
      const accessorIndex = primitive.indices ?? primitive.attributes.POSITION;
      const count = accessorIndex === undefined ? undefined : accessors[accessorIndex]?.count;
      if (count === undefined) throw invalidContent();
      const mode = primitive.mode ?? MODE_TRIANGLES;
      if (mode === MODE_TRIANGLES) total += Math.floor(count / 3);
      else if (mode === MODE_STRIP || mode === MODE_FAN) total += Math.max(count - 2, 0);
    }
  }
  return total;
}

async function assertTextureSizes(parsed: ParsedGlb): Promise<void> {
  const { json, bin } = parsed;
  const images = json.images ?? [];
  if (images.length === 0) return;
  const { default: sharp } = await import('sharp');
  for (const image of images) {
    const view = image.bufferView === undefined ? undefined : json.bufferViews?.[image.bufferView];
    if (!view || !bin || !EMBEDDED_IMAGE_MIME.includes(image.mimeType ?? ''))
      throw invalidContent();
    const start = view.byteOffset ?? 0;
    if (start + view.byteLength > bin.length) throw invalidContent();
    const meta = await sharp(bin.subarray(start, start + view.byteLength))
      .metadata()
      .catch(() => {
        throw invalidContent();
      });
    if ((meta.width ?? 0) > MAX_MODEL_TEXTURE_SIZE || (meta.height ?? 0) > MAX_MODEL_TEXTURE_SIZE) {
      throw new AppError('MODEL_LIMIT_EXCEEDED', 400);
    }
  }
}

async function assertReadable(buffer: Buffer, json: GltfJson): Promise<void> {
  const compressed = (json.extensionsUsed ?? []).some((name) =>
    COMPRESSION_EXTENSIONS.includes(name),
  );
  if (compressed) return;
  try {
    await new NodeIO().readBinary(new Uint8Array(buffer));
  } catch {
    throw invalidContent();
  }
}

/** Validates an uploaded binary glTF 2.0 file; throws a coded AppError when it is unacceptable. */
export async function validateGlb(buffer: Buffer): Promise<void> {
  if (buffer.length > MAX_MODEL_BYTES) throw new AppError('MODEL_TOO_LARGE', 413);
  const parsed = parseContainer(buffer);
  assertSelfContained(parsed.json);
  assertAllowedExtensions(parsed.json);
  if (countTriangles(parsed.json) > MAX_MODEL_TRIANGLES)
    throw new AppError('MODEL_LIMIT_EXCEEDED', 400);
  await assertTextureSizes(parsed);
  await assertReadable(buffer, parsed.json);
}
