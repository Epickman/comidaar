import {defineField, defineType} from 'sanity'
import {CommentIcon} from '@sanity/icons/Comment'

// Reseña de un plato del menú. Llega como borrador desde el sitio (api/resenas.js);
// se muestra en el sitio recién cuando se publica.
export const resena = defineType({
  name: 'resena',
  title: 'Reseña',
  type: 'document',
  icon: CommentIcon,
  fields: [
    defineField({
      name: 'plato',
      title: 'Plato (id)',
      description: 'Identificador del plato en data/menu.json',
      type: 'string',
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'platoNombre',
      title: 'Plato',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'autor',
      title: 'Nombre',
      type: 'string',
      validation: (rule) => rule.required().max(60),
    }),
    defineField({
      name: 'estrellas',
      title: 'Estrellas',
      type: 'number',
      options: {list: [1, 2, 3, 4, 5]},
      validation: (rule) => rule.required().integer().min(1).max(5),
    }),
    defineField({
      name: 'texto',
      title: 'Comentario',
      type: 'text',
      rows: 4,
      validation: (rule) => rule.required().max(600),
    }),
  ],
  preview: {
    select: {autor: 'autor', plato: 'platoNombre', estrellas: 'estrellas', texto: 'texto'},
    prepare: ({autor, plato, estrellas, texto}) => ({
      title: `${'★'.repeat(estrellas || 0)} ${autor || 'Sin nombre'}`,
      subtitle: [plato, texto].filter(Boolean).join(' — '),
    }),
  },
})
