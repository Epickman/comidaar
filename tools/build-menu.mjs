// Genera menu/index.html a partir de data/menu-adultos.json.
// Los platos y el JSON-LD quedan en el HTML (sin depender de JS) para buscadores.
//
//   node tools/build-menu.mjs
//
// Campo opcional por plato:
//   modelo3d  { "glb": "models/x.glb", "usdz": "models/x.usdz" } → botón "Ver en AR" en el modal.
//             Si ningún plato tiene modelo, <model-viewer> no se carga.
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const menu = JSON.parse(readFileSync(new URL('data/menu-adultos.json', root), 'utf8'));

const SECCIONES = [
  { id: 'entradas', titulo: 'Platos de entrada' },
  { id: 'principales', titulo: 'Platos principales' },
  { id: 'postres', titulo: 'Postres' },
];
const IMG_W = 1200;
const IMG_H = 676;
const EAGER = 3; // las primeras fotos no se cargan en diferido
const DESCRIPCION = 'Menú adultos de Vonharv: platos de entrada, principales y postres, con foto y descripción de cada plato.';

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const url = (p) => `../${p}`; // la página vive en /menu/

const secciones = SECCIONES.map((s) => ({
  ...s,
  platos: menu.platos.filter((p) => p.categoria === s.id).sort((a, b) => a.orden - b.orden),
}));
const conAR = menu.platos.some((p) => p.modelo3d?.glb);

let n = 0;
function card(p) {
  const lazy = n++ >= EAGER;
  const ar = p.modelo3d?.glb
    ? ` data-glb="${esc(url(p.modelo3d.glb))}"${p.modelo3d.usdz ? ` data-usdz="${esc(url(p.modelo3d.usdz))}"` : ''}`
    : '';
  return `
          <li>
            <button type="button" class="menu-card" id="${esc(p.id)}" aria-haspopup="dialog"${ar}>
              <span class="menu-card-media"><img src="${esc(url(p.imagen))}" alt="${esc(p.nombre)}" width="${IMG_W}" height="${IMG_H}"${lazy ? ' loading="lazy"' : ' fetchpriority="high"'} decoding="async"></span>
              <span class="menu-card-body">
                <span class="menu-card-title">${esc(p.nombre)}</span>
                <span class="menu-card-desc">${esc(p.descripcion)}</span>
              </span>
            </button>
          </li>`;
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Menu',
  name: `${menu.titulo} · Vonharv`,
  description: DESCRIPCION,
  inLanguage: 'es',
  hasMenuSection: secciones.map((s) => ({
    '@type': 'MenuSection',
    name: s.titulo,
    hasMenuItem: s.platos.map((p) => ({
      '@type': 'MenuItem',
      name: p.nombre,
      description: p.descripcion,
      image: url(p.imagen),
    })),
  })),
};

const html = `<!doctype html>
<!-- Generado por tools/build-menu.mjs a partir de data/menu-adultos.json. No editar a mano. -->
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(menu.titulo)} · Vonharv</title>
  <meta name="description" content="${esc(DESCRIPCION)}">
  <meta name="theme-color" content="#050505">
  <link rel="icon" href="../assets/logo-blanco.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;0,6..96,600;1,6..96,400;1,6..96,500&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../styles.css">
  <link rel="stylesheet" href="menu.css">
  <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>${conAR ? `
  <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"></script>` : ''}
</head>
<body data-view="menu">
  <div class="grain" aria-hidden="true"></div>
  <header class="topbar" id="topbar">
    <div class="topbar-side">
      <a href="../" class="topbar-back" aria-label="Volver a la carta">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>
        <span>Carta</span>
      </a>
    </div>
    <a href="../" class="brand" aria-label="Vonharv — inicio">
      <img src="../assets/logo-blanco.png" alt="Vonharv">
    </a>
    <div class="topbar-side topbar-side--end">
      <a href="./" class="topbar-link" aria-current="page">Menú</a>
    </div>
  </header>

  <main id="app">
    <section class="hero">
      <p class="eyebrow">Vonharv</p>
      <h1>${esc(menu.titulo)}</h1>
      <p>Tocá un plato para verlo en detalle.</p>
    </section>

    <nav class="filters menu-nav" aria-label="Secciones del menú">
      ${secciones.map((s) => `<a class="chip" href="#${s.id}">${esc(s.titulo)}</a>`).join('\n      ')}
    </nav>
${secciones.map((s) => `
    <section class="menu-section" id="${s.id}" aria-labelledby="${s.id}-titulo">
      <h2 class="cat-title" id="${s.id}-titulo">${esc(s.titulo)}</h2>
      <ul class="menu-grid">${s.platos.map(card).join('')}
      </ul>${s.id === 'principales' && menu.nota_principales ? `
      <aside class="menu-nota"><strong>Nota</strong> ${esc(menu.nota_principales)}</aside>` : ''}
    </section>`).join('\n')}
  </main>

  <dialog class="menu-modal" id="menu-modal" aria-labelledby="menu-modal-titulo">
    <button type="button" class="menu-modal-close" aria-label="Cerrar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>
    <div class="menu-modal-media">
      <img alt="" width="${IMG_W}" height="${IMG_H}">
    </div>
    <div class="menu-modal-body">
      <h2 id="menu-modal-titulo"></h2>
      <p></p>
      <button type="button" class="menu-ar" hidden>Ver en AR</button>
    </div>
  </dialog>

  <footer class="foot">
    <img src="../assets/logo-blanco.png" alt="" aria-hidden="true">
    <p>Las imágenes son ilustrativas.</p>
  </footer>

  <script src="menu.js"></script>
</body>
</html>
`;

writeFileSync(new URL('menu/index.html', root), html);
console.log(`menu/index.html: ${secciones.map((s) => `${s.platos.length} ${s.id}`).join(', ')}${conAR ? ' (con AR)' : ''}`);
