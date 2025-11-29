import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist', // Specify the output directory
  },
  define: {
    // Expose environment variables to the client-side code
    'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL)
  }
})