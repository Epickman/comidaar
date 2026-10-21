// Prepara un .glb para AR: lo escala a tamaño real, lo apoya en el piso (y=0),
// lo centra y quita las luces embebidas (model-viewer usa su propia iluminación).
// Uso: node tools/prepare-model.mjs entrada.glb salida.glb [diametro_en_metros=0.27]
import { readFileSync, writeFileSync } from 'node:fs';

const [, , input, output, diamArg = '0.27'] = process.argv;
if (!input || !output) {
  console.error('Uso: node tools/prepare-model.mjs entrada.glb salida.glb [diametro_m]');
  process.exit(1);
}
const target = parseFloat(diamArg);

const data = readFileSync(input);
if (data.readUInt32LE(0) !== 0x46546c67) throw new Error('No es un archivo GLB válido');
const jsonLen = data.readUInt32LE(12);
const json = JSON.parse(data.subarray(20, 20 + jsonLen).toString('utf8'));
const binChunk = data.subarray(20 + jsonLen);

// --- matrices 4x4 (column-major, como glTF) ---
const mul = (a, b) => {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
};
const trs = (n) => {
  if (n.matrix) return n.matrix;
  const [tx, ty, tz] = n.translation || [0, 0, 0];
  const [x, y, z, w] = n.rotation || [0, 0, 0, 1];
  const [sx, sy, sz] = n.scale || [1, 1, 1];
  return [
    (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1,
  ];
};
const apply = (m, [x, y, z]) => [0, 1, 2].map((i) => m[i] * x + m[4 + i] * y + m[8 + i] * z + m[12 + i]);

// --- bounding box del modelo completo ---
const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
const isLight = (n) => n.extensions?.KHR_lights_punctual && n.mesh === undefined && !n.children?.length;
const scene = json.scenes[json.scene ?? 0];
const roots = scene.nodes.filter((i) => !isLight(json.nodes[i]));

function walk(i, parent) {
  const n = json.nodes[i];
  const m = mul(parent, trs(n));
  if (n.mesh !== undefined)
    for (const p of json.meshes[n.mesh].primitives) {
      const a = json.accessors[p.attributes.POSITION];
      for (const cx of [a.min[0], a.max[0]]) for (const cy of [a.min[1], a.max[1]]) for (const cz of [a.min[2], a.max[2]]) {
        const v = apply(m, [cx, cy, cz]);
        v.forEach((c, k) => { min[k] = Math.min(min[k], c); max[k] = Math.max(max[k], c); });
      }
    }
  (n.children || []).forEach((c) => walk(c, m));
}
const I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
roots.forEach((r) => walk(r, I));

const size = [0, 1, 2].map((k) => max[k] - min[k]);
const k = target / Math.max(size[0], size[2]);
const cx = (min[0] + max[0]) / 2, cz = (min[2] + max[2]) / 2;

// La comida no es metálica: muchos exportadores dejan metallicFactor=1 sin mapa,
// lo que hace que el plato se vea oscuro y espejado.
for (const m of json.materials || []) {
  const pbr = (m.pbrMetallicRoughness ||= {});
  if (!pbr.metallicRoughnessTexture) {
    pbr.metallicFactor = 0;
    pbr.roughnessFactor = Math.min(pbr.roughnessFactor ?? 1, 0.75);
  }
}

// --- nuevo nodo raíz con escala + centrado; sin luces ---
for (const n of json.nodes) {
  if (!n.extensions) continue;
  delete n.extensions.KHR_lights_punctual;
  if (!Object.keys(n.extensions).length) delete n.extensions;
}
delete json.extensions?.KHR_lights_punctual;
if (json.extensions && !Object.keys(json.extensions).length) delete json.extensions;
json.extensionsUsed = (json.extensionsUsed || []).filter((e) => e !== 'KHR_lights_punctual');
if (!json.extensionsUsed.length) delete json.extensionsUsed;
json.nodes.push({ name: 'plato', scale: [k, k, k], translation: [-cx * k, -min[1] * k, -cz * k], children: roots });
scene.nodes = [json.nodes.length - 1];

let js = Buffer.from(JSON.stringify(json));
js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
const header = Buffer.alloc(20);
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
header.writeUInt32LE(20 + js.length + binChunk.length, 8);
header.writeUInt32LE(js.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
writeFileSync(output, Buffer.concat([header, js, binChunk]));

const cm = (v) => (v * k * 100).toFixed(1);
console.log(`${output}: ${cm(size[0])} × ${cm(size[2])} cm, alto ${cm(size[1])} cm (escala ×${k.toFixed(3)})`);
