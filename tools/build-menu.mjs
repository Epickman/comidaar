// Genera el sitio a partir de data/menu.json:
//   index.html                     inicio: una pestaña por menú (adultos premium, adultos tradicional,
//                                  adolescentes) con la grilla de platos de cada uno
//   menu/<menu>/<plato>/index.html detalle de cada plato
// Los platos y el JSON-LD quedan en el HTML (sin depender de JS) para buscadores.
//
//   node tools/build-menu.mjs
//
// Cada menú tiene su pestaña (`nombre`) y sus platos
// (categoria: entradas | principales | postres); uno sin platos muestra
// "Próximamente". `contacto.email` es el destino del botón "Escribinos" del detalle.
// `resenas` apunta al proyecto de Sanity donde se guardan y moderan las reseñas (ver studio/ y api/resenas.mjs).
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const data = JSON.parse(readFileSync(new URL('data/menu.json', root), 'utf8'));

const SECCIONES = [
  // `corto` es el nombre de la sección en la barra de navegación en mobile
  { id: 'entradas', titulo: 'Platos de entrada', corto: 'Entradas' },
  { id: 'principales', titulo: 'Platos principales', corto: 'Principales' },
  { id: 'postres', titulo: 'Postres', corto: 'Postres' },
];
const IMG_W = 1200;
const IMG_H = 676;
const EAGER = 3; // las primeras fotos no se cargan en diferido
const DESCRIPCION = 'Menú de Vonharv, adultos premium, adultos tradicional y adolescentes: platos de entrada, principales y postres, con foto y descripción de cada plato.';

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
<!-- Generado por tools/build-menu.mjs a partir de data/menu.json. No editar a mano. -->
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

const contacto = data.contacto?.email;
const cta = (m) => `
        <div class="menu-cta">
          <p>¿No encontrás lo que te gusta?</p>
          ${contacto ? `<a class="menu-cta-btn" href="mailto:${esc(contacto)}?subject=${encodeURIComponent(`Consulta sobre el ${m.titulo}`)}">Escribinos</a>` : ''}
        </div>`;

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
      <nav class="filters menu-nav" aria-label="Secciones del ${esc(m.titulo)}">
        ${m.secciones.map((s) => `<a class="chip" href="#${s.ancla}"><span class="chip-largo">${esc(s.titulo)}</span><span class="chip-corto" aria-hidden="true">${esc(s.corto)}</span></a>`).join('\n        ')}
      </nav>
${m.secciones.map((s) => `
      <section class="menu-section" id="${s.ancla}" aria-labelledby="${s.ancla}-titulo">
        <h2 class="cat-title" id="${s.ancla}-titulo">${esc(s.titulo)}</h2>
        <ul class="menu-grid">${s.platos.map((p) => card(m, p)).join('')}
        </ul>${s.id === 'principales' && m.nota_principales ? `
        <aside class="menu-nota"><strong>Nota</strong> ${esc(m.nota_principales)}</aside>` : ''}
      </section>`).join('\n')}
      <div class="menu-sin-resultados" hidden>
        <p>No encontramos platos con “<span></span>”.</p>${cta(m)}
      </div>` : `
      <p class="menu-vacio">Próximamente.</p>`;
  return `
    <div class="menu-panel" id="${m.id}" role="tabpanel" aria-label="${esc(m.titulo)}"${i ? ' hidden' : ''}>${contenido}
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

    <div class="buscador" role="search">
      <label class="sr-only" for="buscar">Buscar un plato</label>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>
      <input id="buscar" type="search" placeholder="Buscar un plato o ingrediente" autocomplete="off" enterkeyhint="search">
      <p class="buscador-estado" aria-live="polite"></p>
    </div>

    <div class="menu-tabs">
      <div class="menu-tabs-fila" role="tablist" aria-label="Menús" data-grupo="menu">
        ${menus.map((o, i) => `<button type="button" class="menu-tab" role="tab" data-valor="${o.id}" aria-controls="${o.id}" aria-selected="${!i}"${i ? ' tabindex="-1"' : ''}>${esc(o.nombre)}</button>`).join('\n        ')}
      </div>
    </div>
${menus.map(panel).join('\n')}`,
}));

// ---------- detalle: menu/<menu>/<plato>/index.html ----------
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
              <p class="carrusel-desc">${esc(p.descripcion)}</p>
              <section class="resenas" data-plato="${esc(p.id)}" aria-label="Reseñas de ${esc(p.nombre)}">
                <p class="carrusel-seccion">Reseñas</p>
                <div class="resenas-contenido"><p class="resenas-vacio">Sin reseñas todavía.</p></div>
              </section>
              <details class="resena-nueva">
                <summary>Dejá tu reseña</summary>
                <form class="resena-form" data-plato="${esc(p.id)}">
                  <fieldset class="resena-puntaje">
                    <legend>Tu puntaje</legend>
                    ${[1, 2, 3, 4, 5].map((n) => `<label><input type="radio" name="estrellas" value="${n}" required><span aria-hidden="true">★</span><span class="sr-only">${n} ${n === 1 ? 'estrella' : 'estrellas'}</span></label>`).join('')}
                  </fieldset>
                  <label class="resena-campo">Nombre<input name="autor" maxlength="60" autocomplete="given-name" required></label>
                  <label class="resena-campo">Comentario<textarea name="texto" rows="3" maxlength="600" required></textarea></label>
                  <label class="resena-trampa" aria-hidden="true">Web<input name="web" tabindex="-1" autocomplete="off"></label>
                  <button type="submit" class="menu-cta-btn">Enviar reseña</button>
                  <p class="resena-msj" role="status"></p>
                </form>
              </details>
            </div>
          </li>`;
}

// borra las páginas generadas antes (también las de menús que ya no existen)
for (const d of readdirSync(new URL('menu/', root), { withFileTypes: true })) {
  if (d.isDirectory()) rmSync(new URL(`menu/${d.name}/`, root), { recursive: true });
}

// Las reseñas aprobadas se leen en vivo desde Sanity (menu.js); el formulario las envía a la función.
const RESENAS = data.resenas
  ? ` data-resenas-proyecto="${esc(data.resenas.projectId)}" data-resenas-dataset="${esc(data.resenas.dataset)}" data-resenas-envio="${esc(data.resenas.endpoint)}"`
  : '';

let paginas = 0;
for (const m of menus) {
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
      <nav class="menu-tabs" aria-label="Menús">
        <div class="menu-tabs-fila">
          ${menus.map((o) => `<a class="menu-tab" href="../../../#${o.id}"${o === m ? ' aria-current="page"' : ''}>${esc(o.nombre)}</a>`).join('\n          ')}
        </div>
      </nav>

      <section class="carrusel" aria-roledescription="carrusel" aria-label="${esc(m.titulo)}"${RESENAS}>
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
console.log(`${paginas} páginas de detalle${contacto ? '' : ' — falta contacto.email en data/menu.json: el botón "Escribinos" no se muestra'}`);
