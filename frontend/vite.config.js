import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'      // ← hozzáadva
import { fileURLToPath, URL } from 'node:url'

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  console.log('TMDB kulcs:', env.VITE_TMDB_API_KEY)

  return defineConfig({
    plugins: [
      react(),
      tailwind()                              // ← hozzáadva ide is
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    define: {
      __TMDB_API_KEY__: JSON.stringify(env.VITE_TMDB_API_KEY),
    },
  })
}
