(() => {
  // ---------- header: se compacta al hacer scroll (igual que la carta) ----------
  const topbar = document.getElementById('topbar');
  const tabsBar = document.querySelector('.menu-tabs');
  const syncHeader = () => {
    topbar.classList.toggle('scrolled', scrollY > 8);
    document.documentElement.style.setProperty('--header-h', `${topbar.offsetHeight}px`);
    if (tabsBar) document.documentElement.style.setProperty('--tabs-h', `${tabsBar.offsetHeight}px`);
  };
  addEventListener('scroll', syncHeader, { passive: true });
  new ResizeObserver(syncHeader).observe(topbar);
  if (tabsBar) new ResizeObserver(syncHeader).observe(tabsBar);
  syncHeader();

  // ---------- pestañas: Adultos Premium / Adultos Tradicional / Adolescentes ----------
  const panels = [...document.querySelectorAll('.menu-panel')];
  const grupos = [...document.querySelectorAll('.menu-tabs [role="tablist"]')];
  const estadoTabs = {};
  grupos.forEach((g) => { estadoTabs[g.dataset.grupo] = g.querySelector('[aria-selected="true"]').dataset.valor; });

  function mostrar({ foco = null, hash = true } = {}) {
    const id = estadoTabs.menu;
    panels.forEach((p) => { p.hidden = p.id !== id; });
    grupos.forEach((g) => g.querySelectorAll('[role="tab"]').forEach((t) => {
      const sel = t.dataset.valor === estadoTabs[g.dataset.grupo];
      t.setAttribute('aria-selected', String(sel));
      t.tabIndex = sel ? 0 : -1;
    }));
    foco?.focus();
    if (hash) history.replaceState(null, '', `#${id}`);
    document.getElementById('buscar')?.dispatchEvent(new Event('input')); // actualiza el conteo
  }

  grupos.forEach((g) => {
    const tabs = [...g.querySelectorAll('[role="tab"]')];
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => { estadoTabs[g.dataset.grupo] = t.dataset.valor; mostrar(); });
      t.addEventListener('keydown', (e) => {
        const paso = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!paso) return;
        e.preventDefault();
        const otra = tabs[(i + paso + tabs.length) % tabs.length];
        estadoTabs[g.dataset.grupo] = otra.dataset.valor;
        mostrar({ foco: otra });
      });
    });
  });

  // #adolescentes abre ese menú; #adultos-premium-postres abre Adultos Premium y baja a la sección
  function desdeHash() {
    const destino = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    const panel = destino?.closest('.menu-panel');
    if (!panel) return;
    estadoTabs.menu = panel.id;
    mostrar({ hash: false });
    if (destino !== panel) destino.scrollIntoView();
  }
  if (panels.length) {
    addEventListener('hashchange', desdeHash);
    desdeHash();
  }

  // ---------- navegación entre secciones: marca la sección visible ----------
  const chips = [...document.querySelectorAll('.menu-nav .chip')];
  const secciones = [...document.querySelectorAll('.menu-section')];
  const visibles = new Set();
  const marcar = () => {
    const actual = secciones.find((s) => visibles.has(s.id))?.id;
    if (!actual) return; // entre secciones se mantiene la última marcada
    chips.forEach((c) => {
      if (c.hash === `#${actual}`) c.setAttribute('aria-current', 'true');
      else c.removeAttribute('aria-current');
    });
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? visibles.add(e.target.id) : visibles.delete(e.target.id)));
    marcar();
  }, { rootMargin: '-35% 0px -55% 0px' });
  secciones.forEach((s) => io.observe(s));

  // ---------- buscador (inicio): filtra por nombre y descripción, sin importar tildes ----------
  const buscar = document.getElementById('buscar');
  if (buscar) {
    const normalizar = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const estado = document.querySelector('.buscador-estado');
    const items = [...document.querySelectorAll('.menu-card')].map((c) => ({ li: c.parentElement, texto: normalizar(c.textContent) }));

    buscar.addEventListener('input', () => {
      const q = normalizar(buscar.value.trim());
      const palabras = q.split(/\s+/).filter(Boolean);
      items.forEach((it) => { it.li.hidden = !palabras.every((w) => it.texto.includes(w)); });
      panels.forEach((panel) => {
        let total = 0;
        panel.querySelectorAll('.menu-section').forEach((sec) => {
          const n = sec.querySelectorAll('.menu-grid li:not([hidden])').length;
          sec.hidden = !n;
          panel.querySelector(`.menu-nav .chip[href="#${sec.id}"]`).hidden = !n;
          total += n;
        });
        const sin = panel.querySelector('.menu-sin-resultados');
        if (sin) {
          sin.hidden = !q || total > 0;
          sin.querySelector('span').textContent = buscar.value.trim();
        }
        const nav = panel.querySelector('.menu-nav');
        if (nav) nav.hidden = q && !total;
        const conPlatos = panel.querySelector('.menu-section');
        if (!panel.hidden) estado.textContent = q && conPlatos ? (total === 1 ? '1 plato' : `${total} platos`) : '';
      });
    });
  }

  // ---------- carrusel de platos ----------
  const pista = document.querySelector('.carrusel-pista');
  if (pista) {
    const cards = [...pista.children];
    const numero = document.querySelector('.carrusel-count span');
    const boxes = [...document.querySelectorAll('.lista-box')];
    let activa = cards.findIndex((c) => c.classList.contains('is-activa'));

    const centrar = (c, behavior) => pista.scrollTo({ left: c.offsetLeft - (pista.clientWidth - c.offsetWidth) / 2, behavior });
    // al dar la vuelta (del último al primero o al revés) salta sin recorrer todo
    const ir = (i) => centrar(cards[(i + cards.length) % cards.length], i < 0 || i >= cards.length ? 'instant' : 'smooth');

    function marcarActiva() {
      const medio = pista.scrollLeft + pista.clientWidth / 2;
      let i = 0;
      cards.forEach((c, j) => {
        if (Math.abs(c.offsetLeft + c.offsetWidth / 2 - medio) < Math.abs(cards[i].offsetLeft + cards[i].offsetWidth / 2 - medio)) i = j;
      });
      if (i === activa) return;
      cards[activa]?.classList.remove('is-activa');
      cards[i].classList.add('is-activa');
      activa = i;
      numero.textContent = i + 1;
      boxes.forEach((b) => (b.dataset.id === cards[i].id ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
      document.title = cards[i].dataset.titulo;
      // la URL sigue al plato visible (sin sumar entradas al historial)
      history.replaceState(null, '', `../${cards[i].id}/`);
    }

    centrar(cards[activa], 'instant');
    let pendiente = false;
    pista.addEventListener('scroll', () => {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(() => { pendiente = false; marcarActiva(); });
    }, { passive: true });

    document.querySelector('.carrusel-prev').addEventListener('click', () => ir(activa - 1));
    document.querySelector('.carrusel-next').addEventListener('click', () => ir(activa + 1));
    // tocar una card vecina la trae al centro
    cards.forEach((c, j) => c.addEventListener('click', (e) => {
      if (j === activa) return;
      e.preventDefault();
      ir(j);
    }));
    addEventListener('keydown', (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.target.closest('input, textarea, select, [contenteditable]')) return; // escribiendo una reseña
      if (e.key === 'ArrowLeft') { e.preventDefault(); ir(activa - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); ir(activa + 1); }
    });
    addEventListener('resize', () => centrar(cards[activa], 'instant'));

    // listado: un box lleva el carrusel a ese plato y vuelve arriba
    boxes.forEach((b) => b.addEventListener('click', (e) => {
      e.preventDefault();
      ir(cards.findIndex((c) => c.id === b.dataset.id));
      document.querySelector('.carrusel').scrollIntoView({ behavior: 'smooth' });
    }));
  }
  // ---------- reseñas: se leen las aprobadas desde Sanity y el formulario las envía a /api/resenas ----------
  const carrusel = document.querySelector('.carrusel[data-resenas-proyecto]');
  if (carrusel) {
    const { resenasProyecto: proyecto, resenasDataset: dataset, resenasEnvio: envio } = carrusel.dataset;
    const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const estrellas = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

    const bloques = [...document.querySelectorAll('.resenas[data-plato]')];
    const query = '*[_type == "resena" && plato in $platos] | order(_createdAt desc){ plato, autor, estrellas, texto }';
    const params = new URLSearchParams({ query, $platos: JSON.stringify(bloques.map((b) => b.dataset.plato)) });
    fetch(`https://${proyecto}.apicdn.sanity.io/v2026-10-21/data/query/${dataset}?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(({ result }) => {
        bloques.forEach((b) => {
          const lista = result.filter((r) => r.plato === b.dataset.plato);
          if (!lista.length) return;
          const promedio = lista.reduce((t, r) => t + r.estrellas, 0) / lista.length;
          b.innerHTML = `
            <p class="resenas-resumen"><span class="resena-estrellas" aria-hidden="true">${estrellas(Math.round(promedio))}</span>
              <span>${promedio.toFixed(1).replace('.', ',')} · ${lista.length === 1 ? '1 reseña' : `${lista.length} reseñas`}</span></p>
            <ul>${lista.map((r) => `
              <li>
                <span class="resena-estrellas" role="img" aria-label="${r.estrellas} de 5 estrellas">${estrellas(r.estrellas)}</span>
                <blockquote>“${esc(r.texto)}”</blockquote>
                <p class="resena-autor">${esc(r.autor)}</p>
              </li>`).join('')}
            </ul>`;
          b.hidden = false;
        });
      })
      .catch(() => {}); // sin reseñas visibles si Sanity no responde

    document.querySelectorAll('.resena-form').forEach((form) => form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msj = form.querySelector('.resena-msj');
      const boton = form.querySelector('button[type="submit"]');
      const datos = Object.fromEntries(new FormData(form));
      boton.disabled = true;
      msj.textContent = 'Enviando…';
      try {
        const r = await fetch(envio, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...datos, plato: form.dataset.plato, estrellas: Number(datos.estrellas) }),
        });
        const res = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(res.error);
        form.reset();
        msj.textContent = '¡Gracias! Vamos a publicar tu reseña cuando la revisemos.';
      } catch (err) {
        msj.textContent = err.message || 'No pudimos enviar la reseña. Probá de nuevo más tarde.';
      } finally {
        boton.disabled = false;
      }
    }));
  }
})();
