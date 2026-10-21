# Vonharv · Menú adultos

Menú web de Vonharv con la estética de [vonharv.com](https://vonharv.com). Al entrar se ve el menú,
con pestañas **Premium** y **Regular**, cada una dividida en platos de entrada, principales y postres.
Tocando un plato se abre su página con foto, descripción y anterior/siguiente.

Es un sitio estático (HTML/CSS/JS), sin dependencias.

## Probarlo

```bash
cd ~/Desktop/vonharv-ar
python3 -m http.server 5180
# abrir http://localhost:5180
```

Para publicarlo sirve tal cual en Vercel, Netlify o GitHub Pages.

## Cambiar el menú

Todo está en `data/menu-adultos.json`: un bloque por menú (`premium`, `regular`) con sus platos
(`categoria`: `entradas` | `principales` | `postres`, `orden`, `nombre`, `descripcion`, `imagen`).
Las fotos (1200×676) van en `assets/menu/`. Un menú sin platos muestra “Próximamente”.
`contacto.email` es el destino del botón “Escribinos” de cada plato.

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
| `data/menu-adultos.json` | el menú |
| `assets/menu/` | fotos de los platos |
| `tools/build-menu.mjs` | genera el HTML desde el JSON |
