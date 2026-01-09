import axios from 'axios'
import { cacheService } from './cache'

const API_BASE_URL = 'https://api.cacem.fr'
const LIMIT = 5000

export const fetchPassages = async (useCache = true, onProgress = null) => {
  try {
    // Cache check - ultra rapide
    if (useCache) {
      const cachedData = cacheService.get()
      if (cachedData?.length > 0) {
        onProgress?.({ 
          current: cachedData.length, 
          total: cachedData.length, 
          fromCache: true,
          completed: true
        })
        return cachedData
      }
    }

    // Réutiliser la requête préchargée si elle existe
    let firstResponse
    if (window._apiPreloadPromise) {
      try {
        const preloadResponse = await window._apiPreloadPromise
        if (preloadResponse?.ok) {
          firstResponse = { data: await preloadResponse.json() }
          window._apiPreloadPromise = null
          window._apiPreloadController = null
        }
      } catch {}
    }
    
    // Si pas de préchargement, faire la requête normalement
    if (!firstResponse) {
      firstResponse = await axios.get(`${API_BASE_URL}/api/v2/dechets/passages`, {
        params: { $limit: LIMIT, $skip: 0 },
        timeout: 0,
        headers: { 'Accept': 'application/json' }
      })
    }

    // Traiter la première réponse
    const firstPageData = firstResponse.data?.data || []
    const total = firstResponse.data?.total || 0
    
    // Si toutes les données sont récupérées en une page
    if (firstPageData.length >= total || firstPageData.length < LIMIT) {
      if (useCache && firstPageData.length > 0) {
        cacheService.set(firstPageData)
      }
      onProgress?.({
        current: firstPageData.length,
        total: total,
        completed: true,
        fromCache: false
      })
      return firstPageData
    }
    
    // Calculer le nombre de pages nécessaires
    const totalPages = Math.ceil(total / LIMIT)
    
    // Si une seule page, retourner directement
    if (totalPages <= 1) {
      if (useCache && firstPageData.length > 0) {
        cacheService.set(firstPageData)
      }
      return firstPageData
    }
    
    // LANCER LES REQUÊTES EN PARALLÈLE (1 seule à la fois pour les connexions lentes)
    const finalData = firstPageData
    let currentTotal = firstPageData.length
    // Détecter les connexions lentes et réduire le parallélisme
    let MAX_CONCURRENT = 1 // Par défaut 1 pour les connexions modestes
    if ('connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
      if (connection) {
        // 2 requêtes simultanées seulement pour les connexions rapides (4G uniquement)
        if (connection.effectiveType === '4g') {
          MAX_CONCURRENT = 2
        }
      }
    }
    
    for (let startPage = 2; startPage <= totalPages; startPage += MAX_CONCURRENT) {
      const batchPromises = []
      const endPage = Math.min(startPage + MAX_CONCURRENT - 1, totalPages)
      
      for (let page = startPage; page <= endPage; page++) {
        const skip = (page - 1) * LIMIT
        batchPromises.push(
          axios.get(`${API_BASE_URL}/api/v2/dechets/passages`, {
            params: { $limit: LIMIT, $skip: skip },
            timeout: 0,
            headers: { 'Accept': 'application/json' }
          }).then(response => ({
            page,
            data: response.data?.data || []
          })).catch(() => ({ page, data: [] }))
        )
      }
      
      // Attendre ce batch
      const batchResults = await Promise.all(batchPromises)
      
      // Trier et ajouter les résultats
      batchResults.sort((a, b) => a.page - b.page)
      for (const result of batchResults) {
        if (result.data.length > 0) {
          Array.prototype.push.apply(finalData, result.data)
          currentTotal += result.data.length
          onProgress?.({
            current: currentTotal,
            total: total,
            page: result.page,
            fromCache: false
          })
        }
      }
    }
    
    if (useCache && finalData.length > 0) {
      cacheService.set(finalData)
    }
    
    onProgress?.({
      current: finalData.length,
      total: total,
      completed: true,
      fromCache: false
    })
    
    return finalData
  } catch (error) {
    if (error.response) {
      throw new Error(`Erreur serveur: ${error.response.status}`)
    } else if (error.request) {
      throw new Error('Impossible de contacter le serveur')
    }
    throw error
  }
}

export const fetchPassagesV1 = async () => {
  const response = await axios.get(`${API_BASE_URL}/api/v1/dechets/passages`)
  return response.data?.data || []
}

