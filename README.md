# Vonharv · Menú

Menú web de Vonharv con la estética de [vonharv.com](https://vonharv.com). Al entrar se ve el menú,
con pestañas **Adultos Premium**, **Adultos Tradicional** y **Adolescentes**.
Cada menú se divide en platos de entrada, principales y postres, y tiene un buscador. Tocando un plato
se abre un carrusel con todas las cards del menú y, debajo, el listado de platos.

Es un sitio estático (HTML/CSS/JS), sin dependencias.

## Probarlo

```bash
cd ~/Desktop/vonharv-ar
python3 -m http.server 5180
# abrir http://localhost:5180
```

Para publicarlo sirve tal cual en Vercel, Netlify o GitHub Pages.

## Cambiar el menú

Todo está en `data/menu.json`: un bloque por menú (`id`, `nombre` de la pestaña, `titulo`) con sus platos
(`categoria`: `entradas` | `principales` | `postres`, `orden`, `nombre`, `descripcion`, `imagen`).
Las fotos (1200×676) van en `assets/menu/`. Un menú sin platos muestra “Próximamente”.
`contacto.email` es el destino del botón “Escribinos” de cada plato.
Cada plato puede tener reseñas, que se muestran en su card del carrusel:
`"resenas": [{ "autor": "María G.", "texto": "…", "estrellas": 5 }]` (`estrellas` es opcional).

Después de editar el JSON, regenerá el HTML (los platos y el JSON-LD `schema.org/Menu` quedan
escritos en la página para buscadores):

```bash
node tools/build-menu.mjs   # reescribe index.html y menu/<menu>/<plato>/
```

## Archivos

| | |
|---|---|
| `index.html` | inicio con el menú (generado) |
| `menu/<menu>/<plato>/` | página de cada plato (generadas) |
| `styles.css`, `menu/menu.css`, `menu/menu.js` | estilos y comportamiento |
| `data/menu.json` | el menú |
| `assets/menu/` | fotos de los platos |
| `tools/build-menu.mjs` | genera el HTML desde el JSON |
