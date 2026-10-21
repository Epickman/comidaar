// Genera modelos 3D (.glb) procedurales de los platos, a escala real (metros).
// Son modelos de muestra: reemplazalos por escaneos reales del plato cuando los tengas.
// Uso: node tools/generate-models.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'models');
mkdirSync(OUT, { recursive: true });

// ---------- utilidades ----------
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const noise = (x, y, z) =>
  (Math.sin(x * 1.7 + y * 3.1) * Math.cos(z * 2.3 - x * 1.1) +
    0.5 * Math.sin(y * 2.9 + z * 1.3 + 1.7) +
    0.35 * Math.sin(x * 4.3 - z * 3.7 + y * 0.9)) / 1.85;
const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255].map((c) => srgbToLinear(c / 255));
const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((c) => c / l); };

function rotate([x, y, z], [rx, ry, rz]) {
  let c = Math.cos(rx), s = Math.sin(rx);
  [y, z] = [y * c - z * s, y * s + z * c];
  c = Math.cos(ry); s = Math.sin(ry);
  [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(rz); s = Math.sin(rz);
  [x, y] = [x * c - y * s, x * s + y * c];
  return [x, y, z];
}

// ---------- primitivas ----------
function sphere(ws = 24, hs = 16) {
  const pos = [], nor = [], idx = [];
  for (let iy = 0; iy <= hs; iy++) {
    const phi = (iy / hs) * Math.PI;
    for (let ix = 0; ix <= ws; ix++) {
      const th = (ix / ws) * Math.PI * 2;
      const p = [-Math.cos(th) * Math.sin(phi), Math.cos(phi), Math.sin(th) * Math.sin(phi)];
      pos.push(p); nor.push(p);
    }
  }
  for (let iy = 0; iy < hs; iy++)
    for (let ix = 0; ix < ws; ix++) {
      const a = iy * (ws + 1) + ix, b = a + ws + 1;
      if (iy !== 0) idx.push([a, b, a + 1]);
      if (iy !== hs - 1) idx.push([b, b + 1, a + 1]);
    }
  return { pos, nor, idx };
}

// Superelipsoide: e<1 da formas tipo "cubo redondeado".
function superellipsoid(e = 0.4, ws = 20, hs = 14) {
  const g = sphere(ws, hs);
  g.pos = g.pos.map((p) => p.map((c) => Math.sign(c) * Math.abs(c) ** e));
  g.nor = g.pos.map((p) => norm(p.map((c) => Math.sign(c) * Math.abs(c) ** (2 / e - 1))));
  return g;
}

function box() {
  const pos = [], nor = [], idx = [];
  const faces = [
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 1, 0], [0, 0, 1]],
    [[0, 1, 0], [1, 0, 0], [0, 0, 1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
    [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [1, 0, 0], [0, 1, 0]],
  ];
  for (const [n, u, v] of faces) {
    const b = pos.length;
    for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]])
      pos.push([0, 1, 2].map((i) => 0.5 * (n[i] + su * u[i] + sv * v[i]))), nor.push(n);
    idx.push([b, b + 1, b + 2], [b, b + 2, b + 3]);
  }
  return { pos, nor, idx };
}

// Torno: perfil [[radio, altura], ...] girado sobre el eje Y.
function lathe(profile, seg = 64, smoothDeg = 40) {
  const pos = [], nor = [], idx = [];
  const segN = [];
  for (let i = 0; i < profile.length - 1; i++) {
    const [r0, y0] = profile[i], [r1, y1] = profile[i + 1];
    segN.push(norm([-(y1 - y0), r1 - r0]));
  }
  const cosLim = Math.cos((smoothDeg * Math.PI) / 180);
  const blend = (a, b) => (b && a[0] * b[0] + a[1] * b[1] > cosLim ? norm([a[0] + b[0], a[1] + b[1]]) : a);
  for (let i = 0; i < segN.length; i++) {
    const ends = [[profile[i], blend(segN[i], segN[i - 1])], [profile[i + 1], blend(segN[i], segN[i + 1])]];
    const base = pos.length;
    for (const [[r, y], [nr, ny]] of ends)
      for (let j = 0; j <= seg; j++) {
        const th = (j / seg) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
        pos.push([r * c, y, r * s]); nor.push([nr * c, ny, nr * s]);
      }
    for (let j = 0; j < seg; j++) {
      const a = base + j, b = base + seg + 1 + j;
      idx.push([a, b, a + 1], [b, b + 1, a + 1]);
    }
  }
  return { pos, nor, idx };
}

function transform(g, { s = [1, 1, 1], r = [0, 0, 0], t = [0, 0, 0] } = {}) {
  if (typeof s === 'number') s = [s, s, s];
  return {
    pos: g.pos.map((p) => rotate(p.map((c, i) => c * s[i]), r).map((c, i) => c + t[i])),
    nor: g.nor.map((n) => rotate(norm(n.map((c, i) => c / s[i])), r)),
    idx: g.idx,
  };
}

function displace(g, amp, freq, off = 0) {
  return {
    ...g,
    pos: g.pos.map((p, i) => {
      const d = amp * noise(p[0] * freq + off, p[1] * freq, p[2] * freq - off);
      return p.map((c, k) => c + g.nor[i][k] * d);
    }),
  };
}

// ---------- escena / exportador GLB ----------
class Scene {
  constructor() { this.mats = new Map(); }
  material(name, color, rough = 0.6, metal = 0) {
    this.mats.set(name, { color: hex(color), rough, metal, pos: [], nor: [], col: [], idx: [] });
  }
  add(name, g, vary = 0.12) {
    const m = this.mats.get(name);
    const base = m.pos.length;
    g.pos.forEach((p) => {
      const n = 0.5 + 0.5 * noise(p[0] * 260, p[1] * 260, p[2] * 260);
      const k = 1 - vary * n;
      m.col.push([k, k, k]);
    });
    m.pos.push(...g.pos); m.nor.push(...g.nor);
    for (let [a, b, c] of g.idx) {
      const [pa, pb, pc] = [g.pos[a], g.pos[b], g.pos[c]];
      const u = pb.map((v, i) => v - pa[i]), w = pc.map((v, i) => v - pa[i]);
      const fn = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      if (Math.hypot(...fn) < 1e-14) continue;
      const vn = [0, 1, 2].map((i) => g.nor[a][i] + g.nor[b][i] + g.nor[c][i]);
      if (fn[0] * vn[0] + fn[1] * vn[1] + fn[2] * vn[2] < 0) [b, c] = [c, b];
      m.idx.push([a + base, b + base, c + base]);
    }
  }
  toGLB(name) {
    const json = {
      asset: { version: '2.0', generator: 'vonharv-procedural' },
      scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name }],
      meshes: [{ name, primitives: [] }], materials: [], accessors: [], bufferViews: [], buffers: [],
    };
    const chunks = []; let offset = 0;
    const view = (arr, target) => {
      const buf = Buffer.from(arr.buffer);
      json.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: buf.length, target });
      chunks.push(buf); offset += buf.length;
      return json.bufferViews.length - 1;
    };
    const acc = (list, type, extra = {}) => {
      const flat = new Float32Array(list.flat());
      json.accessors.push({ bufferView: view(flat, 34962), componentType: 5126, count: list.length, type, ...extra });
      return json.accessors.length - 1;
    };
    for (const [mname, m] of this.mats) {
      if (!m.idx.length) continue;
      const min = [0, 1, 2].map((i) => Math.min(...m.pos.map((p) => p[i])));
      const max = [0, 1, 2].map((i) => Math.max(...m.pos.map((p) => p[i])));
      const POSITION = acc(m.pos, 'VEC3', { min, max });
      const NORMAL = acc(m.nor, 'VEC3');
      const COLOR_0 = acc(m.col, 'VEC3');
      const ind = new Uint32Array(m.idx.flat());
      json.accessors.push({ bufferView: view(ind, 34963), componentType: 5125, count: ind.length, type: 'SCALAR' });
      json.materials.push({
        name: mname,
        pbrMetallicRoughness: { baseColorFactor: [...m.color, 1], metallicFactor: m.metal, roughnessFactor: m.rough },
      });
      json.meshes[0].primitives.push({
        attributes: { POSITION, NORMAL, COLOR_0 }, indices: json.accessors.length - 1, material: json.materials.length - 1,
      });
    }
    const bin = Buffer.concat(chunks);
    const binPad = Buffer.concat([bin, Buffer.alloc((4 - (bin.length % 4)) % 4)]);
    json.buffers.push({ byteLength: binPad.length });
    let js = Buffer.from(JSON.stringify(json));
    js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
    const header = Buffer.alloc(12);
    header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
    header.writeUInt32LE(12 + 8 + js.length + 8 + binPad.length, 8);
    const ch = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.writeUInt32LE(type, 4); return b; };
    return Buffer.concat([header, ch(js.length, 0x4e4f534a), js, ch(binPad.length, 0x004e4942), binPad]);
  }
}

// ---------- vajilla ----------
const PLATE_TOP = 0.013;
function plate(sc, mat = 'ceramica') {
  sc.add(mat, lathe([
    [0, 0.013], [0.085, 0.013], [0.1, 0.0145], [0.122, 0.021], [0.135, 0.0235], [0.136, 0.022],
    [0.134, 0.0205], [0.12, 0.017], [0.098, 0.009], [0.09, 0.006], [0.088, 0], [0, 0],
  ], 96), 0.03);
}
function bowl(sc, mat = 'ceramica') {
  sc.add(mat, lathe([
    [0, 0.008], [0.07, 0.009], [0.1, 0.02], [0.125, 0.04], [0.135, 0.046], [0.138, 0.045],
    [0.13, 0.038], [0.105, 0.016], [0.075, 0.004], [0.06, 0], [0, 0],
  ], 96), 0.03);
}

// Coloca n piezas sobre un disco de radio R.
function scatter(rand, n, R, fn) {
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * R;
    fn(Math.cos(a) * r, Math.sin(a) * r, i);
  }
}

// ---------- platos ----------
const dishes = {
  'ojo-de-bife'(sc, rand) {
    sc.material('gres', 0x2b2825, 0.75);
    sc.material('costra', 0x4e2716, 0.7);
    sc.material('rosado', 0xb04548, 0.45);
    sc.material('papa', 0xd9a23f, 0.55);
    sc.material('chimi', 0x4a6b2b, 0.25);
    sc.material('verde', 0x2f5a1f, 0.5);
    sc.material('aji', 0xa83a20, 0.5);
    sc.material('sal', 0xf5f3ee, 0.3);
    plate(sc, 'gres');
    for (let i = 0; i < 5; i++) {
      const x = -0.05 + i * 0.014, z = -0.015, ry = 0.25 + i * 0.03, lean = -0.5;
      const t = [x, PLATE_TOP + 0.0135, z];
      sc.add('costra', displace(transform(superellipsoid(0.3), { s: [0.007, 0.016, 0.038], r: [0, ry, lean], t }), 0.0008, 300, i), 0.25);
      sc.add('rosado', transform(superellipsoid(0.3), { s: [0.0074, 0.0128, 0.033], r: [0, ry, lean], t }), 0.2);
      for (let k = 0; k < 4; k++)
        sc.add('sal', transform(box(), { s: 0.0022, r: [rand(), rand(), rand()], t: [x + 0.004, PLATE_TOP + 0.03, z + (rand() - 0.5) * 0.05] }), 0);
    }
    scatter(rand, 9, 0.028, (x, z) =>
      sc.add('papa', displace(transform(superellipsoid(0.35), {
        s: [0.008, 0.007, 0.016], r: [rand() * 0.4, rand() * 3, rand() * 0.3], t: [0.05 + x, PLATE_TOP + 0.007 + rand() * 0.006, 0.03 + z],
      }), 0.0006, 400, rand() * 9), 0.25));
    sc.add('chimi', displace(transform(sphere(), { s: [0.032, 0.0035, 0.02], r: [0, 0.3, 0], t: [-0.005, PLATE_TOP, 0.065] }), 0.003, 80), 0.2);
    scatter(rand, 40, 0.025, (x, z) =>
      sc.add(rand() > 0.3 ? 'verde' : 'aji', transform(sphere(8, 6), { s: [0.0022, 0.001, 0.0018], t: [-0.005 + x, PLATE_TOP + 0.0032, 0.065 + z * 0.7] }), 0));
  },

  'risotto-hongos'(sc, rand) {
    sc.material('ceramica', 0xf4f1ea, 0.25);
    sc.material('arroz', 0xe6d3a3, 0.55);
    sc.material('grano', 0xf2e6c4, 0.4);
    sc.material('hongo', 0x6e4526, 0.6);
    sc.material('hongo-int', 0xc9a37a, 0.7);
    sc.material('queso', 0xf3e2a2, 0.45);
    sc.material('perejil', 0x3d6b22, 0.5);
    sc.material('oliva', 0xc9a227, 0.08);
    bowl(sc);
    const Y = 0.012, H = 0.02, R = 0.088;
    sc.add('arroz', displace(transform(sphere(48, 24), { s: [R, H, R], t: [0, Y, 0] }), 0.0025, 90), 0.15);
    const surf = (x, z) => Y + H * Math.sqrt(Math.max(0, 1 - (x * x + z * z) / (R * R)));
    scatter(rand, 320, 0.08, (x, z) =>
      sc.add('grano', transform(sphere(8, 5), { s: [0.0034, 0.0017, 0.0017], r: [rand(), rand() * 3, 0], t: [x, surf(x, z) + 0.001, z] }), 0.1));
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9 + rand(), r = 0.015 + rand() * 0.035, x = Math.cos(a) * r, z = Math.sin(a) * r;
      const rr = [rand() * 0.5 - 0.25, rand() * 3, rand() * 0.4 - 0.2], t = [x, surf(x, z) + 0.004, z];
      sc.add('hongo', transform(sphere(20, 10), { s: [0.022, 0.006, 0.016], r: rr, t }), 0.25);
      sc.add('hongo-int', transform(sphere(20, 10), { s: [0.019, 0.0064, 0.0125], r: rr, t }), 0.2);
    }
    for (let i = 0; i < 9; i++) {
      const x = (rand() - 0.5) * 0.06, z = (rand() - 0.5) * 0.06;
      sc.add('queso', transform(superellipsoid(0.2), { s: [0.012, 0.0006, 0.008], r: [rand() * 0.6, rand() * 3, rand() * 0.6], t: [x, surf(x, z) + 0.009, z] }), 0.15);
    }
    scatter(rand, 45, 0.07, (x, z) =>
      sc.add('perejil', transform(sphere(8, 5), { s: [0.0025, 0.0006, 0.0018], r: [0, rand() * 3, 0], t: [x, surf(x, z) + 0.0028, z] }), 0.2));
    scatter(rand, 12, 0.075, (x, z) =>
      sc.add('oliva', transform(sphere(10, 6), { s: [0.003, 0.0008, 0.003], t: [x, surf(x, z) + 0.0018, z] }), 0));
  },

  'sorrentinos-calabaza'(sc, rand) {
    sc.material('ceramica', 0xf4f1ea, 0.25);
    sc.material('manteca', 0xb5792c, 0.12);
    sc.material('pasta', 0xf0cf80, 0.5);
    sc.material('salvia', 0x6d8556, 0.35);
    sc.material('nuez', 0x8b5a2b, 0.7);
    sc.material('queso', 0xf6eccb, 0.6);
    plate(sc);
    sc.add('manteca', displace(transform(sphere(48, 12), { s: [0.082, 0.0025, 0.082], t: [0, PLATE_TOP, 0] }), 0.004, 45), 0.2);
    const pasta = lathe([[0, 0.017], [0.01, 0.0155], [0.017, 0.011], [0.021, 0.0055], [0.028, 0.003], [0.031, 0.0016], [0.0305, 0], [0, 0]], 40);
    const spots = [[0, 0], ...[0, 1, 2, 3, 4].map((i) => [Math.cos(i * 1.2566) * 0.058, Math.sin(i * 1.2566) * 0.058])];
    spots.forEach(([x, z], i) =>
      sc.add('pasta', displace(transform(pasta, { r: [rand() * 0.08, rand() * 3, rand() * 0.08], t: [x, PLATE_TOP + 0.0018, z] }), 0.0008, 220, i), 0.18));
    for (let i = 0; i < 6; i++) {
      const [x, z] = spots[1 + (i % 5)];
      sc.add('salvia', displace(transform(sphere(16, 8), { s: [0.022, 0.0012, 0.009], r: [rand() * 0.4, rand() * 3, rand() * 0.4], t: [x * 0.55, PLATE_TOP + 0.02, z * 0.55] }), 0.0008, 180), 0.25);
    }
    scatter(rand, 10, 0.075, (x, z) =>
      sc.add('nuez', displace(transform(sphere(10, 8), { s: [0.006, 0.004, 0.005], r: [rand(), rand(), rand()], t: [x, PLATE_TOP + 0.016 + rand() * 0.004, z] }), 0.0012, 500, rand() * 9), 0.3));
    scatter(rand, 70, 0.05, (x, z) =>
      sc.add('queso', transform(box(), { s: [0.0025, 0.0008, 0.001], r: [rand(), rand() * 3, rand()], t: [x, PLATE_TOP + 0.019, z] }), 0));
  },

  'salmon-esparragos'(sc, rand) {
    sc.material('ceramica', 0xf4f1ea, 0.25);
    sc.material('pure', 0x9cb554, 0.4);
    sc.material('salmon', 0xe9784a, 0.4);
    sc.material('dorado', 0xa8502a, 0.5);
    sc.material('grasa', 0xf6caa8, 0.4);
    sc.material('esparrago', 0x5f8a34, 0.45);
    sc.material('punta', 0x45692a, 0.6);
    sc.material('limon', 0xf2d04b, 0.35);
    sc.material('salsa', 0xf3eacb, 0.15);
    sc.material('eneldo', 0x3f6e2a, 0.5);
    plate(sc);
    sc.add('pure', displace(transform(sphere(36, 12), { s: [0.06, 0.006, 0.048], t: [-0.01, PLATE_TOP, 0.005] }), 0.003, 70), 0.15);
    const fr = [0, 0.35, 0], ft = [-0.01, PLATE_TOP + 0.02, 0.005];
    sc.add('salmon', displace(transform(superellipsoid(0.35, 32, 20), { s: [0.045, 0.014, 0.027], r: fr, t: ft }), 0.0012, 120), 0.12);
    sc.add('dorado', displace(transform(superellipsoid(0.35, 32, 10), { s: [0.0455, 0.003, 0.0275], r: fr, t: [ft[0], ft[1] + 0.0118, ft[2]] }), 0.0008, 160), 0.3);
    for (let i = -3; i <= 3; i++) {
      const [x, , z] = rotate([i * 0.011, 0, 0.0272], fr);
      sc.add('grasa', transform(box(), { s: [0.0014, 0.022, 0.0012], r: [0, 0.35, 0.25], t: [ft[0] + x, ft[1] - 0.001, ft[2] + z] }), 0);
    }
    for (let i = 0; i < 5; i++) {
      const z = -0.07 + i * 0.011, ry = 0.08 * (i - 2);
      const t = [0.005 + i * 0.002, PLATE_TOP + 0.005, z];
      sc.add('esparrago', transform(lathe([[0, 0.055], [0.0048, 0.055], [0.0052, -0.055], [0, -0.055]], 16), { r: [0, ry, Math.PI / 2], t }), 0.2);
      const [tx, , tz] = rotate([-0.06, 0, 0], [0, ry, 0]);
      sc.add('punta', displace(transform(sphere(12, 8), { s: [0.012, 0.0055, 0.0055], r: [0, ry, 0], t: [t[0] + tx, t[1], t[2] + tz] }), 0.001, 600), 0.2);
    }
    sc.add('limon', transform(sphere(20, 10), { s: [0.026, 0.011, 0.013], r: [0, -0.6, 0], t: [0.075, PLATE_TOP + 0.007, 0.05] }), 0.15);
    for (let i = 0; i < 7; i++) {
      const a = 1.6 + i * 0.32;
      sc.add('salsa', transform(sphere(14, 8), { s: [0.006 - i * 0.0005, 0.0025, 0.006 - i * 0.0005], t: [Math.cos(a) * 0.09, PLATE_TOP + 0.0005, Math.sin(a) * 0.09] }), 0);
    }
    scatter(rand, 25, 0.03, (x, z) =>
      sc.add('eneldo', transform(box(), { s: [0.005, 0.0004, 0.0006], r: [rand(), rand() * 3, rand()], t: [ft[0] + x, ft[1] + 0.0165, ft[2] + z * 0.7] }), 0));
  },

  'volcan-chocolate'(sc, rand) {
    sc.material('ceramica', 0xf4f1ea, 0.25);
    sc.material('ganache', 0x2a140b, 0.1);
    sc.material('bizcocho', 0x3a1e12, 0.8);
    sc.material('azucar', 0xfaf8f4, 0.9);
    sc.material('helado', 0xf4e8cc, 0.55);
    sc.material('crumble', 0x9a6a3a, 0.8);
    sc.material('frambuesa', 0xb0213b, 0.35);
    sc.material('arandano', 0x30325c, 0.35);
    sc.material('menta', 0x4f8a3a, 0.4);
    plate(sc);
    sc.add('ganache', displace(transform(sphere(36, 10), { s: [0.095, 0.0022, 0.02], r: [0, 0.45, 0], t: [0, PLATE_TOP, 0.01] }), 0.003, 60), 0.1);
    const cx = -0.025, cz = -0.01;
    sc.add('bizcocho', displace(transform(lathe([[0, 0.056], [0.02, 0.055], [0.031, 0.051], [0.036, 0.044], [0.038, 0], [0, 0]], 64), { t: [cx, PLATE_TOP, cz] }), 0.0012, 200), 0.2);
    sc.add('ganache', transform(sphere(24, 12), { s: [0.014, 0.004, 0.014], t: [cx, PLATE_TOP + 0.056, cz] }), 0.1);
    for (let i = 0; i < 70; i++) {
      const a = rand() * 6.283, r = 0.015 + Math.sqrt(rand()) * 0.017;
      const y = PLATE_TOP + 0.056 - 0.012 * (r / 0.036) ** 3;
      sc.add('azucar', transform(box(), { s: 0.0016, r: [rand(), rand(), rand()], t: [cx + Math.cos(a) * r, y + 0.0008, cz + Math.sin(a) * r] }), 0);
    }
    const ix = 0.05, iz = 0.03;
    scatter(rand, 30, 0.018, (x, z) =>
      sc.add('crumble', transform(box(), { s: [0.004, 0.003, 0.004], r: [rand(), rand(), rand()], t: [ix + x, PLATE_TOP + 0.002, iz + z] }), 0.3));
    sc.add('helado', displace(transform(sphere(36, 24), { s: [0.021, 0.018, 0.021], t: [ix, PLATE_TOP + 0.02, iz] }), 0.0022, 150), 0.12);
    const berry = (bx, by, bz) => {
      for (let k = 0; k < 26; k++) {
        const th = rand() * 6.283, ph = Math.acos(1 - 1.7 * rand());
        const d = [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)];
        sc.add('frambuesa', transform(sphere(8, 6), { s: 0.0028, t: [bx + d[0] * 0.0068, by + d[1] * 0.0075, bz + d[2] * 0.0068] }), 0.2);
      }
    };
    berry(0.03, PLATE_TOP + 0.007, -0.045);
    berry(0.045, PLATE_TOP + 0.007, -0.03);
    berry(-0.075, PLATE_TOP + 0.007, 0.04);
    for (const [x, z] of [[0.055, -0.05], [-0.06, 0.055], [0.02, 0.06]])
      sc.add('arandano', transform(sphere(16, 12), { s: [0.0055, 0.005, 0.0055], t: [x, PLATE_TOP + 0.005, z] }), 0.15);
    for (let i = 0; i < 3; i++)
      sc.add('menta', displace(transform(sphere(16, 8), { s: [0.012, 0.001, 0.007], r: [0.3, i * 2.1, 0.2], t: [cx + Math.cos(i * 2.1) * 0.006, PLATE_TOP + 0.061, cz + Math.sin(i * 2.1) * 0.006] }), 0.0006, 300), 0.2);
  },

  'burrata-tomates'(sc, rand) {
    sc.material('ceramica', 0xf4f1ea, 0.25);
    sc.material('rucula', 0x4b7a2a, 0.45);
    sc.material('rucula2', 0x5f9134, 0.45);
    sc.material('burrata', 0xf7f3ea, 0.45);
    sc.material('crema', 0xfbf6e6, 0.15);
    sc.material('tomate', 0xc62d1f, 0.2);
    sc.material('tomate-am', 0xe8b520, 0.2);
    sc.material('pulpa', 0xe0634a, 0.35);
    sc.material('pesto', 0x4a6e1e, 0.15);
    sc.material('pistacho', 0x9ab55a, 0.6);
    sc.material('pimienta', 0x1b1714, 0.7);
    plate(sc);
    for (let i = 0; i < 70; i++) {
      const a = rand() * 6.283, r = Math.sqrt(rand()) * 0.085;
      const y = PLATE_TOP + 0.002 + (1 - r / 0.085) * 0.02 * rand();
      sc.add(rand() > 0.5 ? 'rucula' : 'rucula2', displace(transform(sphere(14, 8), {
        s: [0.019, 0.0009, 0.007], r: [rand() * 0.8 - 0.4, rand() * 6.28, rand() * 0.8 - 0.4], t: [Math.cos(a) * r, y, Math.sin(a) * r],
      }), 0.001, 400, i), 0.25);
    }
    const by = PLATE_TOP + 0.042;
    sc.add('burrata', displace(transform(sphere(48, 32), { s: [0.038, 0.029, 0.038], t: [0, by, 0] }), 0.0022, 60), 0.08);
    sc.add('crema', displace(transform(sphere(32, 12), { s: [0.02, 0.006, 0.017], t: [0.003, by + 0.026, 0] }), 0.002, 120), 0.05);
    for (let i = 0; i < 12; i++) {
      const a = i * 0.524 + rand() * 0.2, r = 0.058 + rand() * 0.018;
      const t = [Math.cos(a) * r, PLATE_TOP + 0.016 + rand() * 0.006, Math.sin(a) * r];
      const rr = [rand() * 0.5 - 0.25, rand() * 3, rand() * 0.5 - 0.25];
      const skin = sphere(20, 12);
      skin.idx = skin.idx.filter((tri) => tri.every((k) => skin.pos[k][1] <= 0.01));
      sc.add(i % 3 === 2 ? 'tomate-am' : 'tomate', transform(skin, { s: 0.0125, r: rr, t }), 0.1);
      sc.add('pulpa', transform(sphere(20, 6), { s: [0.0118, 0.0012, 0.0118], r: rr, t }), 0.25);
    }
    scatter(rand, 14, 0.07, (x, z) =>
      Math.hypot(x, z) > 0.04 && sc.add('pesto', transform(sphere(10, 6), { s: [0.004, 0.0015, 0.004], t: [x, PLATE_TOP + 0.024, z] }), 0));
    scatter(rand, 40, 0.03, (x, z) =>
      sc.add('pistacho', transform(box(), { s: 0.0024, r: [rand(), rand(), rand()], t: [x, by + 0.029 * Math.sqrt(1 - (Math.hypot(x, z) / 0.038) ** 2) + 0.004 * rand(), z] }), 0.2));
    scatter(rand, 30, 0.03, (x, z) =>
      sc.add('pimienta', transform(box(), { s: 0.0012, r: [rand(), rand(), rand()], t: [x, by + 0.029 * Math.sqrt(1 - (Math.hypot(x, z) / 0.038) ** 2) + 0.002, z] }), 0));
  },
};

for (const [id, build] of Object.entries(dishes)) {
  const sc = new Scene();
  sc.material('ceramica', 0xf4f1ea, 0.25);
  build(sc, rng(id.length * 7919));
  const glb = sc.toGLB(id);
  writeFileSync(join(OUT, `${id}.glb`), glb);
  console.log(`${id}.glb  ${(glb.length / 1024).toFixed(0)} KB`);
}
