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

## Archivos

| | |
|---|---|
| `index.html`, `styles.css`, `app.js` | el sitio |
| `data/platos.js` | la carta |
| `assets/` | logo y fotos |
