// Recibe una reseña desde el formulario de un plato y la guarda en Sanity como borrador.
// No se muestra en el sitio hasta que se aprueba (se publica) en el Studio.
//
// Variable de entorno requerida (Vercel → Settings → Environment Variables):
//   SANITY_WRITE_TOKEN  token del proyecto Vonharv con permiso Editor
import menu from '../data/menu.json' with { type: 'json' };

const PROJECT_ID = menu.resenas.projectId;
const DATASET = menu.resenas.dataset;
const API_VERSION = '2026-10-21';
const MAX_BYTES = 4000;

const platos = new Map(menu.menus.flatMap((m) => m.platos.map((p) => [p.id, p.nombre])));

const respuesta = (status, body) => Response.json(body, { status });
const limpiar = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');

export async function POST(request) {
  const token = process.env.SANITY_WRITE_TOKEN;
  if (!token) return respuesta(500, { error: 'Las reseñas no están configuradas.' });

  const crudo = await request.text();
  if (crudo.length > MAX_BYTES) return respuesta(413, { error: 'La reseña es demasiado larga.' });

  let datos;
  try { datos = JSON.parse(crudo); } catch { return respuesta(400, { error: 'Datos inválidos.' }); }

  // campo trampa: invisible para las personas, los bots lo completan
  if (limpiar(datos.web)) return respuesta(201, { ok: true });

  const plato = limpiar(datos.plato);
  const autor = limpiar(datos.autor);
  const texto = typeof datos.texto === 'string' ? datos.texto.trim() : '';
  const estrellas = Number(datos.estrellas);

  if (!platos.has(plato)) return respuesta(400, { error: 'Plato desconocido.' });
  if (autor.length < 2 || autor.length > 60) return respuesta(400, { error: 'Ingresá tu nombre (hasta 60 caracteres).' });
  if (texto.length < 3 || texto.length > 600) return respuesta(400, { error: 'El comentario tiene que tener entre 3 y 600 caracteres.' });
  if (!Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5) return respuesta(400, { error: 'Elegí de 1 a 5 estrellas.' });

  const res = await fetch(`https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/mutate/${DATASET}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      mutations: [{
        create: {
          // el prefijo drafts. la deja pendiente: los borradores no son públicos
          _id: `drafts.${crypto.randomUUID()}`,
          _type: 'resena',
          plato,
          platoNombre: platos.get(plato),
          autor,
          estrellas,
          texto,
        },
      }],
    }),
  });
  if (!res.ok) return respuesta(502, { error: 'No pudimos guardar la reseña. Probá de nuevo más tarde.' });

  return respuesta(201, { ok: true });
}
