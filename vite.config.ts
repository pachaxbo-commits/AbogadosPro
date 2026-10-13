import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { handleLocalLegalSearch } from './server/localLegalSearch.ts'
import { handleLocalLegalSync } from './server/localLegalSync.ts'

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    plugins: [react(), {
      name: 'legal-search-local-only',
      configureServer(server) {
        server.middlewares.use('/api/legal-search', (request, response, next) => {
          if (request.method !== 'POST') return next()
          void handleLocalLegalSearch(request, response)
        })
        server.middlewares.use('/api/legal-sync', (request, response) => {
          void handleLocalLegalSync(request, response)
        })
      },
    }],
  }
})
