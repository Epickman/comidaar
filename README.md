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

Después de editar el JSON, regenerá el HTML (los platos y el JSON-LD `schema.org/Menu` quedan
escritos en la página para buscadores):

```bash
node tools/build-menu.mjs   # reescribe index.html y menu/<menu>/<plato>/
```

## Reseñas

Cada plato tiene un formulario “Dejá tu reseña” (estrellas, nombre y comentario).

1. El formulario envía la reseña a `api/resenas.mjs` (función de Vercel), que la valida y la guarda
   en Sanity (proyecto **Vonharv**, `s39xep1q`, dataset `production`) como **borrador**.
2. Los borradores no son públicos: la reseña queda pendiente.
3. Para aprobarla, abrí el Studio → **Pendientes de aprobar** → elegí la reseña → **Publish**.
   Para rechazarla, borrala. Solo las publicadas aparecen en el sitio, con el promedio de estrellas.

Studio de moderación (`studio/`):

```bash
cd studio
npm install
npm run dev      # http://localhost:3333
npm run deploy   # lo publica en https://vonharv.sanity.studio
```

Para que el formulario funcione en Vercel:

- Creá un token en [sanity.io/manage](https://www.sanity.io/manage) → Vonharv → API → Tokens, con
  permiso **Editor**, y cargalo en Vercel → Settings → Environment Variables como `SANITY_WRITE_TOKEN`.
- Agregá el dominio del sitio en sanity.io/manage → Vonharv → API → CORS origins (sin credenciales),
  para que el navegador pueda leer las reseñas aprobadas.

## Archivos

| | |
|---|---|
| `index.html` | inicio con el menú (generado) |
| `menu/<menu>/<plato>/` | página de cada plato (generadas) |
| `styles.css`, `menu/menu.css`, `menu/menu.js` | estilos y comportamiento |
| `data/menu.json` | el menú |
| `assets/menu/` | fotos de los platos |
| `tools/build-menu.mjs` | genera el HTML desde el JSON |
| `api/resenas.mjs` | recibe las reseñas y las guarda en Sanity |
| `studio/` | Sanity Studio para moderar las reseñas |
