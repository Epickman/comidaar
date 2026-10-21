(() => {
  // ---------- header: se compacta al hacer scroll (igual que la carta) ----------
  const topbar = document.getElementById('topbar');
  const syncHeader = () => {
    topbar.classList.toggle('scrolled', scrollY > 8);
    document.documentElement.style.setProperty('--header-h', `${topbar.offsetHeight}px`);
  };
  addEventListener('scroll', syncHeader, { passive: true });
  new ResizeObserver(syncHeader).observe(topbar);
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

  // ---------- detalle: pasar de plato con flechas, teclado o deslizando la foto ----------
  const anterior = document.querySelector('.stage-prev');
  const siguiente = document.querySelector('.stage-next');
  if (anterior && siguiente) {
    const recordar = (dir) => { try { sessionStorage.setItem('menu-dir', dir); } catch {} };
    const ir = (a, dir) => { recordar(dir); location.href = a.href; };
    document.querySelectorAll('a[rel="prev"]').forEach((a) => a.addEventListener('click', () => recordar('anterior')));
    document.querySelectorAll('a[rel="next"]').forEach((a) => a.addEventListener('click', () => recordar('siguiente')));

    addEventListener('keydown', (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key === 'ArrowLeft') ir(anterior, 'anterior');
      if (e.key === 'ArrowRight') ir(siguiente, 'siguiente');
    });

    const stage = document.querySelector('.menu-detalle .stage');
    let x0 = null;
    stage.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 50) dx < 0 ? ir(siguiente, 'siguiente') : ir(anterior, 'anterior');
    });
  }

})();
