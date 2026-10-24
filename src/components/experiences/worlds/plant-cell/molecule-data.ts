import { gunzipSync } from 'fflate'

export type MoleculeId = '6FKF' | '3JCU' | '5L8R' | '6RQF' | '1RWT' | '8RUC' | '1AG6' | '1A70' | '1FNB'
export const MOLECULE_IDS: readonly MoleculeId[] = ['6FKF', '3JCU', '5L8R', '6RQF', '1RWT', '8RUC', '1AG6', '1A70', '1FNB']
export const ATP_GROUPS = { rotor: 0, alpha: 1, beta: 2, statorArm: 3, subunitA: 4, ligand: 5 } as const
/** Atomic numbers are the element codes in the offline assets. Radii are in nm. */
export const ELEMENT_RADII_NM: Readonly<Record<number, number>> = {
  6: 0.17, 7: 0.155, 8: 0.152, 12: 0.173, 15: 0.18, 16: 0.18,
  17: 0.175, 20: 0.231, 25: 0.161, 26: 0.156, 29: 0.14, 30: 0.139,
}
export const ATP_GROUP_COLORS = ['#c87f4f', '#d8cdb0', '#b9a882', '#8f9aa3', '#8f9aa3', '#a49c7a'] as const

export interface MoleculeMetadata {
  id: MoleculeId
  title: string
  organism: string
  resolutionAngstrom: number | null
  citationTitle: string
  citationDOI: string
  pdbDOI: string
  license: 'CC0-1.0'
  source: string
  /** Digest of the unmodified, cached source mmCIF; allows offline provenance audit. */
  sourceSha256: string
  assembly: string
  heavyAtomCount: number
  minNm: [number, number, number]
  maxNm: [number, number, number]
  spansNm: [number, number, number]
  warnings: string[]
  chains: { chain: string; authorChain: string; entity: string; description: string; group: number; atomCount: number }[]
  orientation: {
    method: string
    normal: [number, number, number]
    sourceNormal: [number, number, number]
    sourceOriginAngstrom: [number, number, number]
    landmarksNm: Record<string, [number, number, number]>
    stroma: '+Y'
    lumen: '-Y'
  }
  surface: { triangles: number; vertices: number; compressedBytes: number }
  atomGroupCounts?: Record<string, number>
}
export interface MoleculeSurface {
  positions: Float32Array
  normals: Float32Array
  colors: Float32Array
  indices: Uint16Array
  metadata: MoleculeMetadata
}
export interface ATPAtoms {
  positions: Float32Array
  elements: Uint8Array
  groups: Uint8Array
  /** 0 = exposed, 1 = crowded. Visual density proxy from neighbours within 1 nm. */
  occlusion: Float32Array
  chains: Uint8Array
  metadata: MoleculeMetadata
}
const BASE = '/assets/plant-cell/molecules'
async function checkedFetch(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Molecular asset ${url}: HTTP ${response.status}`)
  return response
}
function unpack(bytes: Uint8Array, magic: string) {
  // Some servers return .gz assets with Content-Encoding: gzip, which fetch
  // transparently decodes. Others serve the gzip file as an opaque binary.
  // Accept both transports while still validating the actual asset header.
  const raw = bytes[0] === 0x1f && bytes[1] === 0x8b
    ? gunzipSync(bytes)
    : new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (raw.length < 32) throw new Error(`Truncated ${magic} molecular asset`)
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength)
  const actual = String.fromCharCode(...raw.subarray(0, 4))
  if (actual !== magic || view.getUint32(4, true) !== 1) throw new Error(`Invalid ${magic} molecular asset`)
  return { raw, view }
}
/** Exported decoders also verify checked-in binary integrity in unit tests. */
export function decodeMoleculeSurface(bytes: Uint8Array, metadata: MoleculeMetadata): MoleculeSurface {
  const { raw, view } = unpack(bytes, 'PCMS')
  const count = view.getUint32(8, true), indexCount = view.getUint32(12, true), quantum = view.getFloat32(16, true)
  if (raw.length !== 32 + count * 12 + indexCount * 2) throw new Error('Truncated surface asset')
  const positions = new Float32Array(count * 3), normals = new Float32Array(count * 3), colors = new Float32Array(count * 3)
  for (let i = 0; i < count * 3; i++) {
    positions[i] = view.getInt16(32 + i * 2, true) * quantum
    normals[i] = view.getInt8(32 + count * 6 + i) / 127
    colors[i] = raw[32 + count * 9 + i] / 255
  }
  const indices = new Uint16Array(indexCount)
  for (let i = 0; i < indexCount; i++) indices[i] = view.getUint16(32 + count * 12 + i * 2, true)
  return { positions, normals, colors, indices, metadata }
}
export function decodeATPAtoms(bytes: Uint8Array, metadata: MoleculeMetadata): ATPAtoms {
  const { raw, view } = unpack(bytes, 'PCAT')
  const count = view.getUint32(8, true), quantum = view.getFloat32(12, true)
  if (raw.length !== 32 + count * 10) throw new Error('Truncated atomic asset')
  const positions = new Float32Array(count * 3), occlusion = new Float32Array(count)
  for (let i = 0; i < count * 3; i++) positions[i] = view.getInt16(32 + i * 2, true) * quantum
  for (let i = 0; i < count; i++) occlusion[i] = raw[32 + count * 8 + i] / 255
  return {
    positions, occlusion, metadata,
    elements: raw.slice(32 + count * 6, 32 + count * 7),
    groups: raw.slice(32 + count * 7, 32 + count * 8),
    chains: raw.slice(32 + count * 9, 32 + count * 10),
  }
}
const metadataCache = new Map<MoleculeId, Promise<MoleculeMetadata>>()
const surfaceCache = new Map<MoleculeId, Promise<MoleculeSurface>>()
let atomicCache: Promise<ATPAtoms> | undefined
export function loadMoleculeMetadata(id: MoleculeId): Promise<MoleculeMetadata> {
  let pending = metadataCache.get(id)
  if (!pending) {
    pending = checkedFetch(`${BASE}/${id}.json`).then(response => response.json())
    metadataCache.set(id, pending)
    pending.catch(() => metadataCache.delete(id))
  }
  return pending
}
export function loadMoleculeSurface(id: MoleculeId): Promise<MoleculeSurface> {
  let pending = surfaceCache.get(id)
  if (!pending) {
    pending = Promise.all([checkedFetch(`${BASE}/${id}.surface.bin.gz`).then(response => response.arrayBuffer()), loadMoleculeMetadata(id)])
      .then(([binary, metadata]) => decodeMoleculeSurface(new Uint8Array(binary), metadata))
    surfaceCache.set(id, pending)
    pending.catch(() => surfaceCache.delete(id))
  }
  return pending
}
export function loadATPAtoms(): Promise<ATPAtoms> {
  atomicCache ??= Promise.all([checkedFetch(`${BASE}/6FKF.atoms.bin.gz`).then(response => response.arrayBuffer()), loadMoleculeMetadata('6FKF')])
    .then(([binary, metadata]) => decodeATPAtoms(new Uint8Array(binary), metadata))
  atomicCache.catch(() => { atomicCache = undefined })
  return atomicCache
}

export type MetaboliteId = 'ATP' | 'ADP' | 'PO4'
export interface MetaboliteData {
  id: MetaboliteId
  title: string
  positions: number[]
  elements: number[]
  names: string[]
  /** [atom index, atom index, bond order] from the PDB Chemical Component Dictionary. */
  bonds: [number, number, number][]
  license: 'CC0-1.0'
  coordinateType: string
}
const metaboliteCache = new Map<MetaboliteId, Promise<MetaboliteData>>()
export function loadMetabolite(id: MetaboliteId): Promise<MetaboliteData> {
  let pending = metaboliteCache.get(id)
  if (!pending) {
    pending = checkedFetch(`${BASE}/${id}.ligand.json`).then(response => response.json())
    metaboliteCache.set(id, pending)
    pending.catch(() => metaboliteCache.delete(id))
  }
  return pending
}
