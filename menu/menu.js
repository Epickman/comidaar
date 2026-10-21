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
  const media = modal.querySelector('.menu-modal-media');
  const img = media.querySelector('img');
  const titulo = modal.querySelector('h2');
  const desc = modal.querySelector('.menu-modal-body p');
  const btnAR = modal.querySelector('.menu-ar');
  let card = null;

  function abrir(c) {
    card = c;
    const foto = c.querySelector('img');
    img.src = foto.currentSrc || foto.src;
    img.alt = foto.alt;
    img.hidden = false;
    titulo.textContent = c.querySelector('.menu-card-title').textContent;
    desc.textContent = c.querySelector('.menu-card-desc').textContent;
    btnAR.hidden = !c.dataset.glb;
    modal.showModal();
  }

  function cerrar() { modal.close(); }

  modal.addEventListener('close', () => {
    media.querySelector('model-viewer')?.remove();
    card?.focus();
  });
  modal.querySelector('.menu-modal-close').addEventListener('click', cerrar);
  // click en el fondo (fuera del contenido del diálogo)
  modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });

  document.querySelectorAll('.menu-card').forEach((c) => c.addEventListener('click', () => abrir(c)));

  // ---------- AR (solo si el plato tiene modelo3d; <model-viewer> se carga solo en ese caso) ----------
  btnAR.addEventListener('click', () => {
    if (!card?.dataset.glb || media.querySelector('model-viewer')) return;
    const mv = document.createElement('model-viewer');
    mv.setAttribute('src', card.dataset.glb);
    if (card.dataset.usdz) mv.setAttribute('ios-src', card.dataset.usdz);
    mv.setAttribute('alt', `Modelo 3D de ${img.alt}`);
    mv.setAttribute('ar', '');
    mv.setAttribute('ar-modes', 'webxr scene-viewer quick-look');
    mv.setAttribute('camera-controls', '');
    mv.setAttribute('auto-rotate', '');
    mv.setAttribute('poster', img.src);
    img.hidden = true;
    media.append(mv);
    mv.addEventListener('load', () => { if (mv.canActivateAR) mv.activateAR(); }, { once: true });
  });
})();
