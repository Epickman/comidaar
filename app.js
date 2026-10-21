(() => {
  const app = document.getElementById('app');
  const { categorias, moneda } = window.VONHARV;
  const platos = window.PLATOS;
  let filtro = 'Todos';

  const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const precio = (n) => `${moneda} ${n.toLocaleString('es-AR')}`;

  const ICON_WINE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M7 3h10l-.6 6a4.4 4.4 0 0 1-8.8 0L7 3Z"/><path d="M12 13.5V21M8.5 21h7M7.4 7h9.2"/></svg>';

  // Foto del plato, o un espacio reservado si todavía no hay.
  const foto = (p, lazy) => p.foto
    ? `<img src="${esc(p.foto)}"${p.fotoRecorte ? ` class="recorte-${esc(p.fotoRecorte)}"` : ''} alt="${esc(p.nombre)}"${lazy ? ' loading="lazy"' : ''}>`
    : '<span class="ph-label">Foto próximamente</span>';

  // ---------- catálogo ----------
  function card(p) {
    return `
      <a class="card" href="#/plato/${esc(p.id)}">
        <div class="card-media">${foto(p, true)}</div>
        <div class="card-body">
          <h3>${esc(p.nombre)}</h3>
          <p>${esc(p.resumen)}</p>
          <div class="card-foot">
            <span class="price">${precio(p.precio)}</span>
            <span class="tags">${(p.etiquetas || []).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</span>
          </div>
        </div>
      </a>`;
  }

  function renderCatalogo() {
    document.title = 'Vonharv · Carta';
    const cats = filtro === 'Todos' ? categorias : [filtro];
    app.innerHTML = `
      <section class="hero">
        <p class="eyebrow">La carta de Vonharv</p>
        <h1>Nuestra cocina, <em>en detalle</em>.</h1>
        <p>Elegí un plato para conocer sus ingredientes, alérgenos y el vino que lo acompaña.</p>
      </section>
      <nav class="filters" aria-label="Categorías">
        ${['Todos', ...categorias].map((c) => `<button class="chip" data-cat="${esc(c)}" aria-pressed="${c === filtro}">${esc(c)}</button>`).join('')}
      </nav>
      ${cats.map((c) => {
        const items = platos.filter((p) => p.categoria === c);
        return items.length ? `<h2 class="cat-title">${esc(c)}</h2><div class="grid">${items.map(card).join('')}</div>` : '';
      }).join('')}`;
    app.querySelectorAll('.chip').forEach((b) =>
      b.addEventListener('click', () => { filtro = b.dataset.cat; renderCatalogo(); }));
  }

  // ---------- detalle ----------
  function renderPlato(p) {
    document.title = `${p.nombre} · Vonharv`;
    const i = platos.indexOf(p);
    const prev = platos[(i - 1 + platos.length) % platos.length];
    const next = platos[(i + 1) % platos.length];
    const alergenos = p.alergenos?.length
      ? `<div class="pills">${p.alergenos.map((a) => `<span class="pill warn">${esc(a)}</span>`).join('')}</div>`
      : '<p class="muted">Sin alérgenos principales declarados.</p>';

    app.innerHTML = `
      <article class="detail">
        <div class="stage">${foto(p, false)}</div>

        <div class="info">
          <p class="eyebrow">${esc(p.categoria)}</p>
          <h1>${esc(p.nombre)}</h1>
          <div class="meta-row">
            <span class="price">${precio(p.precio)}</span>
            <span class="tags">${(p.etiquetas || []).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</span>
          </div>
          <p class="lead">${esc(p.descripcion)}</p>

          <div class="facts">
            <div class="fact"><small>Porción</small><strong>${esc(p.porcion)}</strong></div>
            <div class="fact"><small>Energía</small><strong>${esc(p.kcal)} kcal</strong></div>
            <div class="fact"><small>Preparación</small><strong>${esc(p.tiempo)}</strong></div>
          </div>

          <section class="block">
            <h2>Ingredientes</h2>
            <div class="pills">${p.ingredientes.map((x) => `<span class="pill">${esc(x)}</span>`).join('')}</div>
          </section>

          <section class="block">
            <h2>Alérgenos</h2>
            ${alergenos}
          </section>

          ${p.maridaje ? `
          <section class="block">
            <h2>Maridaje sugerido</h2>
            <div class="pairing">${ICON_WINE}<div><small>Nuestro sommelier recomienda</small>${esc(p.maridaje)}</div></div>
          </section>` : ''}

          ${p.nota ? `<blockquote class="chef">“${esc(p.nota)}”<cite>Nota de cocina</cite></blockquote>` : ''}

          <nav class="pager" aria-label="Otros platos">
            <a href="#/plato/${esc(prev.id)}"><small>← Anterior</small><span>${esc(prev.nombre)}</span></a>
            <a href="#/plato/${esc(next.id)}"><small>Siguiente →</small><span>${esc(next.nombre)}</span></a>
          </nav>
        </div>
      </article>`;
  }

  // ---------- rutas ----------
  function route() {
    const m = location.hash.match(/^#\/plato\/([\w-]+)/);
    const p = m && platos.find((x) => x.id === m[1]);
    document.body.dataset.view = p ? 'plato' : 'carta';
    if (p) renderPlato(p); else renderCatalogo();
    window.scrollTo(0, 0);
  }
  // ---------- header: se compacta al hacer scroll ----------
  const topbar = document.getElementById('topbar');
  const syncHeader = () => {
    topbar.classList.toggle('scrolled', scrollY > 8);
    document.documentElement.style.setProperty('--header-h', `${topbar.offsetHeight}px`);
  };
  addEventListener('scroll', syncHeader, { passive: true });
  new ResizeObserver(syncHeader).observe(topbar);

  addEventListener('hashchange', route);
  route();
})();
