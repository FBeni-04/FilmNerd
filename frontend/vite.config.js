import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isGithubPages = env.GITHUB_PAGES === 'true'

  return defineConfig({
    base: isGithubPages ? '/filmnerd/' : '/',

    plugins: [react(), tailwind()],
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
    define: {
      __TMDB_API_KEY__: JSON.stringify(env.VITE_TMDB_API_KEY),
    },
  })
}
