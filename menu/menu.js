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

  // ---------- pestañas Premium / Tradicional ----------
  const tabs = [...document.querySelectorAll('.menu-tab')];
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));

  function elegir(i, { foco = false, hash = true } = {}) {
    tabs.forEach((t, j) => {
      t.setAttribute('aria-selected', String(i === j));
      t.tabIndex = i === j ? 0 : -1;
      panels[j].hidden = i !== j;
    });
    if (foco) tabs[i].focus();
    if (hash) history.replaceState(null, '', `#${panels[i].id}`);
  }

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => elegir(i));
    t.addEventListener('keydown', (e) => {
      const paso = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!paso) return;
      e.preventDefault();
      elegir((i + paso + tabs.length) % tabs.length, { foco: true });
    });
  });

  // #tradicional abre esa pestaña; #premium-postres abre Premium y baja a la sección
  function desdeHash() {
    const destino = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (!destino) return;
    const i = panels.findIndex((p) => p.contains(destino));
    if (i < 0) return;
    elegir(i, { hash: false });
    if (destino !== panels[i]) destino.scrollIntoView();
  }
  addEventListener('hashchange', desdeHash);
  desdeHash();

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
    cards.forEach((c, j) => c.addEventListener('click', () => { if (j !== activa) ir(j); }));
    addEventListener('keydown', (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
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
})();
