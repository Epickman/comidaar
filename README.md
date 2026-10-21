# Vonharv · Carta

Carta web de platos con la estética de [vonharv.com](https://vonharv.com): foto, descripción,
ingredientes, alérgenos, maridaje y nota de cocina de cada plato.

Es un sitio estático (HTML/CSS/JS), sin build ni dependencias.

## Probarlo

```bash
cd ~/Desktop/vonharv-ar
python3 -m http.server 5180
# abrir http://localhost:5180
```

Para publicarlo sirve tal cual en Vercel, Netlify o GitHub Pages.

## Cambiar la carta

Todo está en `data/platos.js`: nombre, precio, descripción, ingredientes, alérgenos,
maridaje, nota de cocina y foto.

Si un plato no tiene `foto`, se muestra “Foto próximamente”. Lo ideal es un PNG/WebP con
fondo transparente en `assets/`; si la foto es un plato visto desde arriba con fondo,
agregá `fotoRecorte: 'circulo'` para recortarlo al plato.

## Menú adultos (`/menu/`)

Página aparte con pestañas **Premium** (41 platos) y **Tradicional** (por ahora vacío: muestra
“Próximamente”). Los datos están en `data/menu-adultos.json`, un bloque por menú, y las fotos (1200×676) en `assets/menu/`. El HTML se genera
desde el JSON para que los platos y el JSON-LD (`schema.org/Menu`) queden en la página:

```bash
node tools/build-menu.mjs   # reescribe menu/index.html
```

## Archivos

| | |
|---|---|
| `index.html`, `styles.css`, `app.js` | el sitio |
| `data/platos.js` | la carta |
| `menu/`, `data/menu-adultos.json`, `assets/menu/` | el menú adultos |
| `tools/build-menu.mjs` | genera `menu/index.html` |
| `assets/` | logo y fotos |
