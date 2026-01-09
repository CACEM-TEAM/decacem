import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    strictPort: false, // Permet d'utiliser un autre port si 3000 est occupé
    open: true,
    // Configuration pour éviter les problèmes avec les chemins UNC
    fs: {
      strict: false // Permet d'accéder aux fichiers en dehors de la racine si nécessaire
    }
  },
  build: {
    // Optimisations de build pour de meilleures performances
    target: 'es2015',
    minify: 'esbuild', // Utiliser esbuild par défaut (plus rapide et compatible avec Vite 6)
    // Code splitting optimisé pour réduire la taille des chunks initiaux
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Séparer Vue du reste
          if (id.includes('node_modules/vue')) {
            return 'vue-vendor'
          }
          // Séparer les bibliothèques de mapping (chargées en lazy)
          if (id.includes('node_modules/leaflet')) {
            return 'map-vendor'
          }
          // Séparer les utilitaires
          if (id.includes('node_modules/fuse.js') || id.includes('node_modules/axios')) {
            return 'utils'
          }
          // Séparer les icônes (chargées en lazy) - tree-shaking automatique
          if (id.includes('node_modules/lucide-vue-next')) {
            return 'icons'
          }
          // Les composants de carte et calendrier sont déjà en lazy loading
        },
        // Optimiser la taille des chunks
        chunkSizeWarningLimit: 500, // Réduire la limite pour forcer plus de splitting
        // Optimiser les noms de chunks
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Activer la compression CSS
    cssCodeSplit: true,
    cssMinify: true,
    // Source maps en production (optionnel, désactiver pour plus de performance)
    sourcemap: false,
    // Optimiser les assets - augmenter la limite pour réduire les requêtes HTTP
    assetsInlineLimit: 8192, // Inline les petits assets (< 8KB) pour réduire les requêtes
    // Améliorer la performance avec des optimisations avancées
    reportCompressedSize: false, // Plus rapide (optionnel)
    // CSS minification activée (utilise esbuild par défaut, très rapide)
  },
  // Optimisations pour le développement
  optimizeDeps: {
    include: ['vue', 'leaflet', 'fuse.js', 'axios'],
    exclude: [],
    // Forcer le pre-bundling pour accélérer le démarrage
    force: false
  },
  // Améliorer les performances de résolution
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})

