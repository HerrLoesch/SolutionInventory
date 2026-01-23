import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/SolutionInventory/',
  plugins: [
    vue(),
    VitePWA({
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
  ]
})
