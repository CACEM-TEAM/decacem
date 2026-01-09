<template>
  <div class="map-container">
    <div ref="mapContainer" class="map"></div>
    <div class="map-info">
      <h3 class="map-title">
        <img src="/images/wired-lineal-18-location-pin-in-jump-dynamic.webp" alt="Localisation" class="title-icon" width="24" height="24" loading="lazy" decoding="async" />
        Localisation
      </h3>
      <div class="address-info">
        <div class="info-item">
          <span class="info-label">Commune:</span>
          <span class="info-value">{{ address.commune }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Voie:</span>
          <span class="info-value">{{ address.voie }}</span>
        </div>
        <div v-if="address.quartier" class="info-item">
          <span class="info-label">Quartier:</span>
          <span class="info-value">{{ address.quartier }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import L from 'leaflet'

// Corriger l'icône par défaut de Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const props = defineProps({
  address: {
    type: Object,
    required: true
  }
})

const mapContainer = ref(null)
let map = null
let marker = null
let currentGeocodeRequest = null // Pour tracker la requête en cours

// Coordonnées approximatives de Fort-de-France (Martinique)
const defaultCoords = [14.6161, -61.0588]

// Cache pour les résultats de géocodage
const geocodeCache = new Map()

const initMap = async () => {
  await nextTick()
  if (!mapContainer.value) return

  // Pour les connexions lentes, différer le chargement de la carte
  if (window._slowConnection) {
    // Attendre que l'utilisateur interagisse ou utiliser requestIdleCallback
    if (window.requestIdleCallback) {
      await new Promise(resolve => {
        requestIdleCallback(resolve, { timeout: 2000 })
      })
    } else {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  map = L.map(mapContainer.value).setView(defaultCoords, 13)

  // Pour les connexions lentes, réduire la qualité des tuiles ou utiliser un cache
  const tileLayerOptions = {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }
  
  // Pour les connexions lentes, réduire le zoom max et activer le cache
  if (window._slowConnection) {
    tileLayerOptions.maxZoom = 16
    tileLayerOptions.useCache = true
  }

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', tileLayerOptions).addTo(map)

  // Marqueur par défaut
  if (props.address) {
    marker = L.marker(defaultCoords).addTo(map)
      .bindPopup(`${props.address.voie}, ${props.address.commune}`)
      .openPopup()
  }
}

// Normaliser une adresse pour améliorer les correspondances
const normalizeAddress = (address) => {
  if (!address) return ''
  
  // Nettoyer les espaces multiples
  let normalized = address.trim().replace(/\s+/g, ' ')
  
  // Normaliser les abréviations communes
  const abbreviations = {
    'bd ': 'boulevard ',
    'bld ': 'boulevard ',
    'av ': 'avenue ',
    'ave ': 'avenue ',
    'r ': 'rue ',
    'pl ': 'place ',
    'ch ': 'chemin ',
    'imp ': 'impasse ',
    'all ': 'allée ',
    'st ': 'saint ',
    'ste ': 'sainte '
  }
  
  for (const [abbr, full] of Object.entries(abbreviations)) {
    const regex = new RegExp(`^${abbr}`, 'i')
    if (regex.test(normalized)) {
      normalized = normalized.replace(regex, full)
    }
  }
  
  return normalized
}

// Normaliser le nom de commune
const normalizeCommune = (commune) => {
  if (!commune) return ''
  
  // Normaliser les noms de communes courants en Martinique
  const communeMap = {
    'fort-de-france': 'Fort-de-France',
    'fdf': 'Fort-de-France',
    'schoelcher': 'Schoelcher',
    'le lamentin': 'Le Lamentin',
    'lamentin': 'Le Lamentin',
    'saint-joseph': 'Saint-Joseph',
    'st-joseph': 'Saint-Joseph',
    'sainte-marie': 'Sainte-Marie',
    'ste-marie': 'Sainte-Marie'
  }
  
  const normalized = commune.toLowerCase().trim()
  return communeMap[normalized] || commune
}

const geocodeAddress = async () => {
  if (!props.address || !map) {
    // Si pas d'adresse, supprimer le marqueur
    if (marker && map) {
      map.removeLayer(marker)
      marker = null
    }
    return
  }

  // Créer un identifiant unique pour cette requête
  const requestId = Date.now()
  currentGeocodeRequest = requestId

  // Créer une clé de cache basée sur l'adresse
  const cacheKey = `${props.address.voie}|${props.address.commune}|${props.address.quartier || ''}`
  
  // Vérifier le cache
  if (geocodeCache.has(cacheKey)) {
    const cached = geocodeCache.get(cacheKey)
    if (map) {
      map.setView([cached.lat, cached.lon], 15)
      // Toujours supprimer l'ancien marqueur
      if (marker) {
        map.removeLayer(marker)
        marker = null
      }
      marker = L.marker([cached.lat, cached.lon]).addTo(map)
        .bindPopup(cached.popup)
        .openPopup()
    }
    return
  }

  // Normaliser les adresses
  const normalizedVoie = normalizeAddress(props.address.voie)
  const normalizedCommune = normalizeCommune(props.address.commune)
  
  let bestResult = null
  
  try {
    // Essayer d'abord l'API BAN (Base Adresse Nationale) - plus précise pour la France
    try {
      const banQuery = `${normalizedVoie}, ${normalizedCommune}, Martinique, France`
      const banResponse = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(banQuery)}&limit=5`,
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      )
      
      if (banResponse.ok) {
        const banData = await banResponse.json()
        
        if (banData.features && banData.features.length > 0) {
          // Chercher le meilleur résultat qui correspond à la commune
          for (const feature of banData.features) {
            const featureProps = feature.properties
            const context = featureProps.context || ''
            const communeMatch = context.toLowerCase().includes(normalizedCommune.toLowerCase()) ||
                               featureProps.city?.toLowerCase().includes(normalizedCommune.toLowerCase())
            
            if (communeMatch && featureProps.score > 0.5) {
              // BAN retourne [lon, lat] en GeoJSON, Leaflet attend [lat, lon]
              const [lon, lat] = feature.geometry.coordinates
              bestResult = {
                lat,
                lon,
                display_name: featureProps.label || `${normalizedVoie}, ${normalizedCommune}`,
                source: 'BAN',
                score: featureProps.score
              }
              break
            }
          }
          
          // Si aucun match exact, prendre le meilleur score
          if (!bestResult && banData.features[0].properties.score > 0.6) {
            const feature = banData.features[0]
            // BAN retourne [lon, lat] en GeoJSON, Leaflet attend [lat, lon]
            const [lon, lat] = feature.geometry.coordinates
            bestResult = {
              lat,
              lon,
              display_name: feature.properties.label || `${normalizedVoie}, ${normalizedCommune}`,
              source: 'BAN',
              score: feature.properties.score
            }
          }
        }
      }
    } catch (banError) {
      console.warn('Erreur API BAN, passage à Nominatim:', banError)
    }
    
    // Si BAN n'a pas fonctionné, essayer Nominatim avec plusieurs variantes
    if (!bestResult) {
      const queries = []
      
      // Requête 1: Avec quartier si disponible (plus précise)
      if (props.address.quartier) {
        queries.push(`${normalizedVoie}, ${props.address.quartier}, ${normalizedCommune}, Martinique, France`)
      }
      
      // Requête 2: Voie normalisée + Commune normalisée
      queries.push(`${normalizedVoie}, ${normalizedCommune}, Martinique, France`)
      
      // Requête 3: Voie originale + Commune normalisée
      if (normalizedVoie !== props.address.voie) {
        queries.push(`${props.address.voie}, ${normalizedCommune}, Martinique, France`)
      }
      
      // Requête 4: Juste la voie si elle contient des informations supplémentaires
      if (normalizedVoie.includes(',')) {
        queries.push(`${normalizedVoie}, Martinique, France`)
      }
      
      // Essayer d'abord la recherche structurée de Nominatim
      const structuredQuery = {
        street: normalizedVoie,
        city: normalizedCommune,
        country: 'France',
        state: 'Martinique',
        format: 'json',
        limit: 5,
        addressdetails: 1,
        'accept-language': 'fr'
      }
      
      if (props.address.quartier) {
        structuredQuery.city = `${props.address.quartier}, ${normalizedCommune}`
      }
      
      const structuredParams = new URLSearchParams()
      Object.keys(structuredQuery).forEach(key => {
        if (structuredQuery[key]) {
          structuredParams.append(key, structuredQuery[key])
        }
      })
      
      await new Promise(resolve => setTimeout(resolve, 1000)) // Respecter le délai Nominatim
      
      const structuredResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?${structuredParams.toString()}`,
        {
          headers: {
            'User-Agent': 'DechetCollecteApp/1.0'
          }
        }
      )
      
      const structuredData = await structuredResponse.json()
      
      if (structuredData && structuredData.length > 0) {
        for (const result of structuredData) {
          const addressParts = result.address || {}
          const communeMatch = addressParts.city?.toLowerCase().includes(normalizedCommune.toLowerCase()) ||
                              addressParts.town?.toLowerCase().includes(normalizedCommune.toLowerCase()) ||
                              addressParts.municipality?.toLowerCase().includes(normalizedCommune.toLowerCase())
          
          if (communeMatch && result.importance > 0.5) {
            bestResult = {
              lat: parseFloat(result.lat),
              lon: parseFloat(result.lon),
              display_name: result.display_name || `${normalizedVoie}, ${normalizedCommune}`,
              source: 'Nominatim',
              importance: result.importance
            }
            break
          }
        }
      }
      
      // Si la recherche structurée n'a pas donné de bon résultat, essayer les requêtes textuelles
      if (!bestResult) {
        for (const query of queries) {
          await new Promise(resolve => setTimeout(resolve, 1000)) // Respecter le délai
          
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&accept-language=fr`,
            {
              headers: {
                'User-Agent': 'DechetCollecteApp/1.0'
              }
            }
          )
          
          const queryData = await response.json()
          
          if (queryData && queryData.length > 0) {
            for (const result of queryData) {
              const addressParts = result.address || {}
              const communeMatch = addressParts.city?.toLowerCase().includes(normalizedCommune.toLowerCase()) ||
                                  addressParts.town?.toLowerCase().includes(normalizedCommune.toLowerCase()) ||
                                  addressParts.municipality?.toLowerCase().includes(normalizedCommune.toLowerCase())
              
              if (communeMatch && result.importance > 0.5) {
                bestResult = {
                  lat: parseFloat(result.lat),
                  lon: parseFloat(result.lon),
                  display_name: result.display_name || `${normalizedVoie}, ${normalizedCommune}`,
                  source: 'Nominatim',
                  importance: result.importance
                }
                break
              }
            }
            
            if (!bestResult && queryData[0].importance > 0.6) {
              const result = queryData[0]
              bestResult = {
                lat: parseFloat(result.lat),
                lon: parseFloat(result.lon),
                display_name: result.display_name || `${normalizedVoie}, ${normalizedCommune}`,
                source: 'Nominatim',
                importance: result.importance
              }
            }
          }
          
          if (bestResult) break
        }
      }
    }
    
    // Vérifier que c'est toujours la requête la plus récente
    if (currentGeocodeRequest !== requestId) {
      console.log('Requête de géocodage ignorée, une nouvelle requête est en cours')
      return
    }
    
    // Toujours supprimer l'ancien marqueur avant d'en créer un nouveau
    if (marker && map) {
      map.removeLayer(marker)
      marker = null
    }
    
    if (bestResult) {
      const lat = bestResult.lat
      const lon = bestResult.lon
      
      if (map) {
        map.setView([lat, lon], 15)
        
        const popupContent = `<strong>${props.address.voie}</strong><br>${props.address.commune}<br><small>${bestResult.display_name}</small>`
        marker = L.marker([lat, lon]).addTo(map)
          .bindPopup(popupContent)
          .openPopup()
        
        geocodeCache.set(cacheKey, {
          lat,
          lon,
          popup: popupContent
        })
      }
    } else {
      console.warn('Aucun résultat de géocodage trouvé pour:', props.address)
      // Toujours créer un marqueur même si aucun résultat n'est trouvé
      if (map) {
        map.setView(defaultCoords, 13)
        marker = L.marker(defaultCoords).addTo(map)
          .bindPopup(`${props.address.voie}, ${props.address.commune}<br><small>Position approximative</small>`)
          .openPopup()
      }
    }
  } catch (error) {
    // Vérifier que c'est toujours la requête la plus récente
    if (currentGeocodeRequest !== requestId) {
      console.log('Erreur ignorée, une nouvelle requête est en cours')
      return
    }
    
    console.error('Erreur de géocodage:', error)
    // Supprimer l'ancien marqueur en cas d'erreur
    if (marker && map) {
      map.removeLayer(marker)
      marker = null
    }
    // Créer un marqueur par défaut en cas d'erreur
    if (map) {
      map.setView(defaultCoords, 13)
      marker = L.marker(defaultCoords).addTo(map)
        .bindPopup(`${props.address.voie}, ${props.address.commune}<br><small>Position approximative</small>`)
        .openPopup()
    }
  }
}

onMounted(() => {
  initMap().then(() => {
    // Attendre que la carte soit initialisée avant de géocoder
    geocodeAddress()
  })
})

watch(() => props.address, (newAddress, oldAddress) => {
  // Vérifier que l'adresse a vraiment changé
  if (newAddress && map) {
    const hasChanged = !oldAddress || 
      oldAddress.voie !== newAddress.voie ||
      oldAddress.commune !== newAddress.commune ||
      (oldAddress.quartier || '') !== (newAddress.quartier || '')
    
    if (hasChanged) {
      // Vider le cache pour cette nouvelle adresse si nécessaire (optionnel)
      // et forcer le géocodage
      geocodeAddress()
    }
  } else if (!newAddress && map) {
    // Si l'adresse est supprimée, nettoyer la carte
    if (marker) {
      map.removeLayer(marker)
      marker = null
    }
    map.setView(defaultCoords, 13)
  }
}, { deep: true, immediate: false })
</script>

<style scoped>
.map-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 400px;
}

.map {
  width: 100%;
  height: 350px;
  border-radius: var(--radius);
  overflow: hidden;
  margin-bottom: 1.5rem;
  z-index: 1;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
}

.map-info {
  flex: 1;
  margin-top: 1.5rem;
}

.map-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.title-icon {
  width: 1.5rem;
  height: 1.5rem;
  object-fit: contain;
}

.address-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  transition: var(--transition);
}

.info-item:hover {
  background: var(--bg-hover);
  border-color: var(--primary);
  transform: translateX(2px);
}

.info-label {
  font-weight: 600;
  color: var(--text-secondary);
  min-width: 90px;
  font-size: 0.9rem;
}

.info-value {
  color: var(--text-primary);
  font-weight: 500;
  font-size: 0.95rem;
}
</style>

