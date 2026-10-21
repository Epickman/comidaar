// Genera el sitio a partir de data/menu-adultos.json:
//   index.html                     inicio: pestañas por menú (premium, regular) con la grilla de platos
//   menu/<menu>/<plato>/index.html detalle de cada plato
// Los platos y el JSON-LD quedan en el HTML (sin depender de JS) para buscadores.
//
//   node tools/build-menu.mjs
//
// Hay un menú por tipo (premium, regular); cada uno con sus platos
// (categoria: entradas | principales | postres); uno sin platos muestra
// "Próximamente". `contacto.email` es el destino del botón "Escribinos" del detalle.
// Reseñas (opcional, por plato): "resenas": [{ "autor": "…", "texto": "…", "estrellas": 5 }]
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

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
const DESCRIPCION = 'Menú adultos de Vonharv, Premium y Regular: platos de entrada, principales y postres, con foto y descripción de cada plato.';

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ld = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

const menus = data.menus.map((m) => {
  const secciones = SECCIONES.map((s) => ({
    ...s,
    ancla: `${m.id}-${s.id}`,
    platos: m.platos.filter((p) => p.categoria === s.id).sort((a, b) => a.orden - b.orden),
  })).filter((s) => s.platos.length);
  return { ...m, secciones, orden: secciones.flatMap((s) => s.platos.map((p) => ({ ...p, seccion: s }))) };
});

// Esqueleto común. `base` es la ruta relativa a la raíz del sitio; `menuBase`, a la carpeta menu/.
function pagina({ base, menuBase, titulo, descripcion, jsonLd, volver, cuerpo, head = '' }) {
  return `<!doctype html>
<!-- Generado por tools/build-menu.mjs a partir de data/menu-adultos.json. No editar a mano. -->
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(titulo)}</title>
  <meta name="description" content="${esc(descripcion)}">
  <meta name="theme-color" content="#050505">
  <link rel="icon" href="${base}assets/logo-blanco.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;0,6..96,600;1,6..96,400;1,6..96,500&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${base}styles.css">
  <link rel="stylesheet" href="${menuBase}menu.css">
  <script type="application/ld+json">${ld(jsonLd)}</script>${head}
</head>
<body data-view="menu">
  <div class="grain" aria-hidden="true"></div>
  <header class="topbar" id="topbar">
    <div class="topbar-side">${volver ? `
      <a href="${volver.href}" class="topbar-back" aria-label="Volver ${volver.aria}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>
        <span>${esc(volver.texto)}</span>
      </a>` : ''}
    </div>
    <a href="${base}" class="brand" aria-label="Vonharv — inicio">
      <img src="${base}assets/logo-blanco.png" alt="Vonharv">
    </a>
    <div class="topbar-side topbar-side--end"></div>
  </header>

  <main id="app">${cuerpo}
  </main>

  <footer class="foot">
    <img src="${base}assets/logo-blanco.png" alt="" aria-hidden="true">
  </footer>

  <script src="${menuBase}menu.js"></script>
</body>
</html>
`;
}

// ---------- inicio: index.html ----------
let n = 0;
function card(m, p) {
  const lazy = n++ >= EAGER;
  return `
            <li>
              <a class="menu-card" id="${esc(p.id)}" href="menu/${m.id}/${esc(p.id)}/">
                <span class="menu-card-media"><img src="${esc(p.imagen)}" alt="${esc(p.nombre)}" width="${IMG_W}" height="${IMG_H}"${lazy ? ' loading="lazy"' : ' fetchpriority="high"'} decoding="async"></span>
                <span class="menu-card-body">
                  <span class="menu-card-title">${esc(p.nombre)}</span>
                  <span class="menu-card-desc">${esc(p.descripcion)}</span>
                </span>
              </a>
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
        <ul class="menu-grid">${s.platos.map((p) => card(m, p)).join('')}
        </ul>${s.id === 'principales' && m.nota_principales ? `
        <aside class="menu-nota"><strong>Nota</strong> ${esc(m.nota_principales)}</aside>` : ''}
      </section>`).join('\n')}` : `
      <p class="menu-vacio">Próximamente.</p>`;
  return `
    <div class="menu-panel" id="${m.id}" role="tabpanel" aria-labelledby="tab-${m.id}"${i ? ' hidden' : ''}>${contenido}
    </div>`;
}

const menuLd = (m, img) => ({
  '@context': 'https://schema.org',
  '@type': 'Menu',
  name: `${m.titulo} · Vonharv`,
  inLanguage: 'es',
  hasMenuSection: m.secciones.map((s) => ({
    '@type': 'MenuSection',
    name: s.titulo,
    hasMenuItem: s.platos.map((p) => ({ '@type': 'MenuItem', name: p.nombre, description: p.descripcion, image: img(p) })),
  })),
});
const conPlatos = menus.filter((m) => m.secciones.length).map((m) => menuLd(m, (p) => p.imagen));

writeFileSync(new URL('index.html', root), pagina({
  base: '',
  menuBase: 'menu/',
  titulo: `${data.titulo} · Vonharv`,
  descripcion: DESCRIPCION,
  jsonLd: conPlatos.length === 1 ? conPlatos[0] : conPlatos,
  cuerpo: `
    <section class="hero">
      <p class="eyebrow">La carta de Vonharv</p>
      <h1>Nuestra cocina, <em>en detalle</em>.</h1>
      <p>Elegí un plato para conocer sus ingredientes, alérgenos y el vino que lo acompaña.</p>
    </section>

    <div class="menu-tabs" role="tablist" aria-label="Tipo de menú">
      ${menus.map((m, i) => `<button type="button" class="menu-tab" role="tab" id="tab-${m.id}" aria-controls="${m.id}" aria-selected="${!i}"${i ? ' tabindex="-1"' : ''}>${esc(m.nombre)}</button>`).join('\n      ')}
    </div>
${menus.map(panel).join('\n')}`,
}));

// ---------- detalle: menu/<menu>/<plato>/index.html ----------
const contacto = data.contacto?.email;
const cta = (m) => `
        <div class="menu-cta">
          <p>¿No encontrás lo que te gusta?</p>
          ${contacto ? `<a class="menu-cta-btn" href="mailto:${esc(contacto)}?subject=${encodeURIComponent(`Consulta sobre el ${m.titulo}`)}">Escribinos</a>` : ''}
        </div>`;
const FLECHA = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;

// Cada página de plato trae el carrusel completo de su menú, arrancando en ese plato.
// Al deslizar, menu.js actualiza la URL y el título al plato visible.
function slide(m, p, actual, cerca) {
  const h = p === actual ? 'h1' : 'h2';
  return `
          <li class="carrusel-card${p === actual ? ' is-activa' : ''}" id="${esc(p.id)}" data-titulo="${esc(`${p.nombre} · ${m.titulo} · Vonharv`)}" aria-roledescription="plato" aria-label="${esc(p.nombre)}">
            <div class="carrusel-media"><img src="../../../${esc(p.imagen)}" alt="${esc(p.nombre)}" width="${IMG_W}" height="${IMG_H}"${cerca ? '' : ' loading="lazy"'} decoding="async"></div>
            <div class="carrusel-body">
              <p class="carrusel-seccion">${esc(p.seccion.titulo)}</p>
              <${h} class="carrusel-titulo">${esc(p.nombre)}</${h}>
              <p class="carrusel-desc">${esc(p.descripcion)}</p>${p.resenas?.length ? `
              <section class="resenas" aria-label="Reseñas de ${esc(p.nombre)}">
                <p class="carrusel-seccion">Reseñas</p>
                <ul>${p.resenas.map((r) => `
                  <li>
                    ${r.estrellas ? `<span class="resena-estrellas" role="img" aria-label="${r.estrellas} de 5 estrellas">${'★'.repeat(r.estrellas)}${'☆'.repeat(5 - r.estrellas)}</span>` : ''}
                    <blockquote>“${esc(r.texto)}”</blockquote>
                    <p class="resena-autor">${esc(r.autor)}</p>
                  </li>`).join('')}
                </ul>
              </section>` : ''}
            </div>
          </li>`;
}

let paginas = 0;
for (const m of menus) {
  rmSync(new URL(`menu/${m.id}/`, root), { recursive: true, force: true });
  m.orden.forEach((p, i) => {
    const total = m.orden.length;
    const cerca = (j) => Math.min(Math.abs(i - j), total - Math.abs(i - j)) <= 1;
    const dir = new URL(`menu/${m.id}/${p.id}/`, root);
    mkdirSync(dir, { recursive: true });
    writeFileSync(new URL('index.html', dir), pagina({
      base: '../../../',
      menuBase: '../../',
      titulo: `${p.nombre} · ${m.titulo} · Vonharv`,
      descripcion: p.descripcion,
      jsonLd: { '@context': 'https://schema.org', '@type': 'MenuItem', name: p.nombre, description: p.descripcion, image: `../../../${p.imagen}` },
      volver: { href: `../../../#${p.seccion.ancla}`, texto: 'Menú', aria: 'al menú' },
      cuerpo: `
      <nav class="menu-tabs" aria-label="Tipo de menú">
        ${menus.map((o) => `<a class="menu-tab" href="../../../#${o.id}"${o === m ? ' aria-current="page"' : ''}>${esc(o.nombre)}</a>`).join('\n        ')}
      </nav>

      <section class="carrusel" aria-roledescription="carrusel" aria-label="${esc(m.titulo)}">
        <div class="carrusel-viewport">
          <ul class="carrusel-pista" tabindex="0">${m.orden.map((q, j) => slide(m, q, p, cerca(j))).join('')}
          </ul>
          <button type="button" class="carrusel-flecha carrusel-prev" aria-label="Plato anterior">${FLECHA('M15 5l-7 7 7 7')}</button>
          <button type="button" class="carrusel-flecha carrusel-next" aria-label="Plato siguiente">${FLECHA('M9 5l7 7-7 7')}</button>
        </div>
        <p class="carrusel-count" aria-live="polite"><span>${i + 1}</span> / ${total}</p>
      </section>

      <section class="lista" aria-label="Todos los platos del ${esc(m.titulo)}">${m.secciones.map((s) => `
        <h2 class="cat-title">${esc(s.titulo)}</h2>
        <ul class="lista-grid">${s.platos.map((q) => `
          <li><a class="lista-box" href="../${esc(q.id)}/" data-id="${esc(q.id)}"${q === p ? ' aria-current="true"' : ''}>
            <img src="../../../${esc(q.imagen)}" alt="" width="${IMG_W}" height="${IMG_H}" loading="lazy" decoding="async">
            <span>${esc(q.nombre)}</span>
          </a></li>`).join('')}
        </ul>`).join('')}
      </section>
${cta(m)}`,
    }));
    paginas++;
  });
}

console.log(`index.html: ${menus.map((m) => `${m.id} (${m.secciones.map((s) => `${s.platos.length} ${s.id}`).join(', ') || 'sin platos'})`).join('; ')}`);
console.log(`${paginas} páginas de detalle${contacto ? '' : ' — falta contacto.email en data/menu-adultos.json: el botón "Escribinos" no se muestra'}`);
