import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {projectId: 's39xep1q', dataset: 'production'},
  // npm run deploy publica el Studio en https://vonharv.sanity.studio
  studioHost: 'vonharv',
})
