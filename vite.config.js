import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const isElectron = mode === 'electron';
  
  return {
    base: isElectron ? './' : '/SolutionInventory/',
    plugins: [
      vue(),
      // Only include PWA plugin for web build
      !isElectron && VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'Solution Inventory',
          short_name: 'Inventory',
          start_url: '/SolutionInventory/',
          display: 'standalone',
          background_color: '#ffffff',
          icons: [
            { src: '/SolutionInventory/pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/SolutionInventory/pwa-512.png', sizes: '512x512', type: 'image/png' }
          ]
        }
      })
    ].filter(Boolean),
    // For Electron, we need to ensure proper paths
    build: {
      outDir: 'dist',
      emptyOutDir: true
    }
  }
})
