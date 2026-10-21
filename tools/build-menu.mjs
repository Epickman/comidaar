// Genera menu/index.html a partir de data/menu-adultos.json.
// Los platos y el JSON-LD quedan en el HTML (sin depender de JS) para buscadores.
//
//   node tools/build-menu.mjs
//
// data/menu-adultos.json tiene un menú por cada tipo (premium, tradicional…); cada uno con
// sus platos (categoria: entradas | principales | postres). Un menú sin platos muestra "Próximamente".
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const data = JSON.parse(readFileSync(new URL('data/menu-adultos.json', root), 'utf8'));

const SECCIONES = [
  { id: 'entradas', titulo: 'Platos de entrada' },
  { id: 'principales', titulo: 'Platos principales' },
  { id: 'postres', titulo: 'Postres' },
];
const IMG_W = 1200;
const IMG_H = 676;
const EAGER = 3; // las primeras fotos no se cargan en diferido
const DESCRIPCION = 'Menú adultos de Vonharv, Premium y Tradicional: platos de entrada, principales y postres, con foto y descripción de cada plato.';

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const url = (p) => `../${p}`; // la página vive en /menu/

const menus = data.menus.map((m) => ({
  ...m,
  secciones: SECCIONES.map((s) => ({
    ...s,
    ancla: `${m.id}-${s.id}`,
    platos: m.platos.filter((p) => p.categoria === s.id).sort((a, b) => a.orden - b.orden),
  })).filter((s) => s.platos.length),
}));

let n = 0;
function card(p) {
  const lazy = n++ >= EAGER;
  return `
            <li>
              <button type="button" class="menu-card" id="${esc(p.id)}" aria-haspopup="dialog">
                <span class="menu-card-media"><img src="${esc(url(p.imagen))}" alt="${esc(p.nombre)}" width="${IMG_W}" height="${IMG_H}"${lazy ? ' loading="lazy"' : ' fetchpriority="high"'} decoding="async"></span>
                <span class="menu-card-body">
                  <span class="menu-card-title">${esc(p.nombre)}</span>
                  <span class="menu-card-desc">${esc(p.descripcion)}</span>
                </span>
              </button>
            </li>`;
}

function panel(m, i) {
  const contenido = m.secciones.length ? `
      <nav class="filters menu-nav" aria-label="Secciones del menú ${esc(m.nombre)}">
        ${m.secciones.map((s) => `<a class="chip" href="#${s.ancla}">${esc(s.titulo)}</a>`).join('\n        ')}
      </nav>
${m.secciones.map((s) => `
      <section class="menu-section" id="${s.ancla}" aria-labelledby="${s.ancla}-titulo">
        <h2 class="cat-title" id="${s.ancla}-titulo">${esc(s.titulo)}</h2>
        <ul class="menu-grid">${s.platos.map(card).join('')}
        </ul>${s.id === 'principales' && m.nota_principales ? `
        <aside class="menu-nota"><strong>Nota</strong> ${esc(m.nota_principales)}</aside>` : ''}
      </section>`).join('\n')}` : `
      <p class="menu-vacio">Próximamente.</p>`;
  return `
    <div class="menu-panel" id="${m.id}" role="tabpanel" aria-labelledby="tab-${m.id}"${i ? ' hidden' : ''}>${contenido}
    </div>`;
}

const jsonLd = menus.filter((m) => m.secciones.length).map((m) => ({
  '@context': 'https://schema.org',
  '@type': 'Menu',
  name: `${m.titulo} · Vonharv`,
  inLanguage: 'es',
  hasMenuSection: m.secciones.map((s) => ({
    '@type': 'MenuSection',
    name: s.titulo,
    hasMenuItem: s.platos.map((p) => ({
      '@type': 'MenuItem',
      name: p.nombre,
      description: p.descripcion,
      image: url(p.imagen),
    })),
  })),
}));

const html = `<!doctype html>
<!-- Generado por tools/build-menu.mjs a partir de data/menu-adultos.json. No editar a mano. -->
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(data.titulo)} · Vonharv</title>
  <meta name="description" content="${esc(DESCRIPCION)}">
  <meta name="theme-color" content="#050505">
  <link rel="icon" href="../assets/logo-blanco.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;0,6..96,600;1,6..96,400;1,6..96,500&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../styles.css">
  <link rel="stylesheet" href="menu.css">
  <script type="application/ld+json">${JSON.stringify(jsonLd.length === 1 ? jsonLd[0] : jsonLd).replace(/</g, '\\u003c')}</script>
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
      <h1>${esc(data.titulo)}</h1>
      <p>Elegí el menú y tocá un plato para verlo en detalle.</p>
    </section>

    <div class="menu-tabs" role="tablist" aria-label="Tipo de menú">
      ${menus.map((m, i) => `<button type="button" class="menu-tab" role="tab" id="tab-${m.id}" aria-controls="${m.id}" aria-selected="${!i}"${i ? ' tabindex="-1"' : ''}>${esc(m.nombre)}</button>`).join('\n      ')}
    </div>
${menus.map(panel).join('\n')}
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
    </div>
  </dialog>

  <footer class="foot">
    <img src="../assets/logo-blanco.png" alt="" aria-hidden="true">
  </footer>

  <script src="menu.js"></script>
</body>
</html>
`;

writeFileSync(new URL('menu/index.html', root), html);
console.log(`menu/index.html: ${menus.map((m) => `${m.id} (${m.secciones.map((s) => `${s.platos.length} ${s.id}`).join(', ') || 'sin platos'})`).join('; ')}`);
