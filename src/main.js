import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { fetchPassages } from './services/api'

// Fonction pour mettre à jour l'écran de chargement
const updateLoader = (text, progress = 0) => {
  const loaderText = document.getElementById('loader-progress-text')
  const loaderFill = document.getElementById('loader-progress-fill')
  
  if (loaderText) {
    loaderText.textContent = text
  }
  
  if (loaderFill) {
    loaderFill.style.width = `${Math.min(100, Math.max(0, progress))}%`
  }
}

// Fonction pour masquer l'écran de chargement
const hideLoader = () => {
  const loader = document.getElementById('initial-loader')
  if (loader) {
    loader.classList.add('hidden')
    // Retirer l'élément du DOM après l'animation
    setTimeout(() => {
      loader.remove()
    }, 300)
  }
}

// Vérifier le cache de manière synchrone et ultra-rapide
function getCachedDataSync() {
  try {
    const cached = localStorage.getItem('dechets_passages_cache')
    if (!cached) return null
    
    const cacheData = JSON.parse(cached)
    
    // Vérifications rapides
    if (cacheData.version !== '1.0.0') return null
    const age = Date.now() - cacheData.timestamp
    if (age > 24 * 60 * 60 * 1000) return null
    
    return cacheData.data
  } catch {
    return null
  }
}

// Charger les données AVANT de monter l'application
async function initializeApp() {
  const cachedData = getCachedDataSync()
  
  if (cachedData?.length > 0) {
    // MONTER L'APP IMMÉDIATEMENT
    const app = createApp(App)
    app.provide('initialData', cachedData)
    app.mount('#app')
    hideLoader()
    
    // Rafraîchir en arrière-plan (différé)
    if (window.requestIdleCallback) {
      requestIdleCallback(() => fetchPassages(true).catch(() => {}), { timeout: 5000 })
    } else {
      setTimeout(() => fetchPassages(true).catch(() => {}), 1000)
    }
    return
  }
  
  updateLoader('Chargement des données...', 5)
  
  try {
    // Timeout de sécurité pour le chargement
    const loadingPromise = fetchPassages(true, (progress) => {
      const percent = progress.total > 0 
        ? Math.round((progress.current / progress.total) * 100)
        : Math.min(95, 5 + (progress.page * 15))
      updateLoader(
        `Chargement... (${progress.current}/${progress.total || '?'})`,
        percent
      )
    })
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout: chargement trop long')), 60000)
    )
    
    const data = await Promise.race([loadingPromise, timeoutPromise])
    
    const app = createApp(App)
    app.provide('initialData', data)
    app.mount('#app')
    hideLoader()
  } catch (error) {
    console.error('Erreur lors du chargement:', error)
    updateLoader(`Erreur: ${error.message || 'Impossible de charger les données'}`, 0)
    // Attendre un peu avant de monter l'app avec des données vides
    setTimeout(() => {
      const app = createApp(App)
      app.provide('initialData', [])
      app.mount('#app')
      hideLoader()
    }, 2000)
  }
}

// Démarrer IMMÉDIATEMENT - pas d'attente
initializeApp()


