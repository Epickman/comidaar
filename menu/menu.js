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

  // ---------- modal del plato ----------
  const modal = document.getElementById('menu-modal');
  const img = modal.querySelector('.menu-modal-media img');
  const titulo = modal.querySelector('h2');
  const desc = modal.querySelector('.menu-modal-body p');
  let card = null;

  function abrir(c) {
    card = c;
    const foto = c.querySelector('img');
    img.src = foto.currentSrc || foto.src;
    img.alt = foto.alt;
    titulo.textContent = c.querySelector('.menu-card-title').textContent;
    desc.textContent = c.querySelector('.menu-card-desc').textContent;
    modal.showModal();
  }

  function cerrar() { modal.close(); }

  modal.addEventListener('close', () => card?.focus());
  modal.querySelector('.menu-modal-close').addEventListener('click', cerrar);
  // click en el fondo (fuera del contenido del diálogo)
  modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });

  document.querySelectorAll('.menu-card').forEach((c) => c.addEventListener('click', () => abrir(c)));
})();
