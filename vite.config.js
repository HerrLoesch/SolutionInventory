import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig(({ mode }) => {
  const isElectron = mode === 'electron';
  
  return {
    base: isElectron ? './' : '/SolutionInventory/',
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version)
    },
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
            { src: '/SolutionInventory/Logo-Large.png', sizes: '512x512', type: 'image/png' }
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
