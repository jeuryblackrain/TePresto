
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    root: '.',
    // Define process.env globally to prevent "process is not defined" errors in client-side libraries
    define: {
      'process.env': env
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    }
  }
})
