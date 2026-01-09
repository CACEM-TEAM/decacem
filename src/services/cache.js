// Service de cache avec localStorage
const CACHE_KEY = 'dechets_passages_cache'
const CACHE_VERSION = '1.0.0'
const CACHE_EXPIRY = 24 * 60 * 60 * 1000 // 24 heures en millisecondes

export const cacheService = {
  // Sauvegarder les données dans le cache (optimisé)
  set(data) {
    try {
      const cacheData = {
        version: CACHE_VERSION,
        timestamp: Date.now(),
        data: data
      }
      // Sauvegarder de manière asynchrone pour ne pas bloquer le rendu
      const json = JSON.stringify(cacheData)
      if (window.requestIdleCallback) {
        requestIdleCallback(() => {
          try {
            localStorage.setItem(CACHE_KEY, json)
          } catch {}
        }, { timeout: 2000 })
      } else {
        setTimeout(() => {
          try {
            localStorage.setItem(CACHE_KEY, json)
          } catch {}
        }, 0)
      }
      return true
    } catch {
      return false
    }
  },

  // Récupérer les données du cache (optimisé pour la vitesse)
  get() {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (!cached) {
        return null
      }

      const cacheData = JSON.parse(cached)
      
      // Vérifications rapides sans logs
      if (cacheData.version !== CACHE_VERSION) {
        this.clear()
        return null
      }

      const age = Date.now() - cacheData.timestamp
      if (age > CACHE_EXPIRY) {
        this.clear()
        return null
      }

      return cacheData.data
    } catch (error) {
      this.clear()
      return null
    }
  },

  // Vérifier si le cache est valide
  isValid() {
    const data = this.get()
    return data !== null
  },

  // Nettoyer le cache
  clear() {
    try {
      localStorage.removeItem(CACHE_KEY)
    } catch {}
  },

  // Obtenir l'âge du cache en heures
  getAge() {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (!cached) return null
      
      const cacheData = JSON.parse(cached)
      const age = Date.now() - cacheData.timestamp
      return Math.round(age / (60 * 60 * 1000))
    } catch {
      return null
    }
  }
}


