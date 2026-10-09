import { Document, NodeIO } from '@gltf-transform/core';

const SEGMENTS = 32;
// Radius/height profile of a simple vase, revolved around the Y axis.
const PROFILE: [number, number][] = [
  [0.0, 0.0],
  [0.55, 0.0],
  [0.7, 0.25],
  [0.75, 0.55],
  [0.55, 0.9],
  [0.3, 1.1],
  [0.32, 1.35],
  [0.42, 1.5],
  [0.38, 1.5],
];

function buildGeometry(): { positions: Float32Array; normals: Float32Array; indices: Uint16Array } {
  const rings = PROFILE.length;
  const positions = new Float32Array(rings * (SEGMENTS + 1) * 3);
  const normals = new Float32Array(positions.length);
  const indices: number[] = [];
  PROFILE.forEach(([radius, height], ring) => {
    for (let seg = 0; seg <= SEGMENTS; seg += 1) {
      const angle = (seg / SEGMENTS) * Math.PI * 2;
      const offset = (ring * (SEGMENTS + 1) + seg) * 3;
      positions.set([Math.cos(angle) * radius, height - 0.75, Math.sin(angle) * radius], offset);
      normals.set([Math.cos(angle), 0.2, Math.sin(angle)], offset);
    }
  });
  for (let ring = 0; ring < rings - 1; ring += 1) {
    for (let seg = 0; seg < SEGMENTS; seg += 1) {
      const a = ring * (SEGMENTS + 1) + seg;
      const b = a + SEGMENTS + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  return { positions, normals, indices: new Uint16Array(indices) };
}

/** Builds a small valid, self-contained .glb (a vase) for seed data and tests. */
export async function buildVaseGlb(
  color: [number, number, number] = [0.72, 0.52, 0.38],
): Promise<Buffer> {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const { positions, normals, indices } = buildGeometry();
  const accessor = (array: Float32Array | Uint16Array, type: 'VEC3' | 'SCALAR') =>
    doc.createAccessor().setArray(array).setType(type).setBuffer(buffer);
  const material = doc
    .createMaterial('clay')
    .setBaseColorFactor([...color, 1])
    .setRoughnessFactor(0.7)
    .setMetallicFactor(0)
    .setDoubleSided(true);
  const primitive = doc
    .createPrimitive()
    .setAttribute('POSITION', accessor(positions, 'VEC3'))
    .setAttribute('NORMAL', accessor(normals, 'VEC3'))
    .setIndices(accessor(indices, 'SCALAR'))
    .setMaterial(material);
  const mesh = doc.createMesh('vase').addPrimitive(primitive);
  const node = doc.createNode('vase').setMesh(mesh);
  doc.createScene('scene').addChild(node);
  return Buffer.from(await new NodeIO().writeBinary(doc));
}
