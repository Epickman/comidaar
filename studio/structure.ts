import type {StructureResolver} from 'sanity/structure'
import {ClockIcon} from '@sanity/icons/Clock'
import {CheckmarkCircleIcon} from '@sanity/icons/CheckmarkCircle'

// Las reseñas llegan como borrador: publicar una es aprobarla.
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Reseñas')
    .items([
      S.listItem()
        .title('Pendientes de aprobar')
        .icon(ClockIcon)
        .child(
          S.documentList()
            .title('Pendientes de aprobar')
            .filter('_type == "resena" && _id in path("drafts.**")')
            .defaultOrdering([{field: '_createdAt', direction: 'desc'}]),
        ),
      S.listItem()
        .title('Publicadas')
        .icon(CheckmarkCircleIcon)
        .child(
          S.documentList()
            .title('Publicadas')
            .filter('_type == "resena" && !(_id in path("drafts.**"))')
            .defaultOrdering([{field: '_createdAt', direction: 'desc'}]),
        ),
    ])
