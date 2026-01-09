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

// Coordonnées approximatives de Fort-de-France (Martinique)
const defaultCoords = [14.6161, -61.0588]

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

const geocodeAddress = async () => {
  if (!props.address || !map) return

  const query = `${props.address.voie}, ${props.address.commune}, Martinique`
  
  try {
    // Utilisation de Nominatim (OpenStreetMap) pour le géocodage
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      {
        headers: {
          'User-Agent': 'DechetCollecteApp/1.0'
        }
      }
    )
    const data = await response.json()
    
    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat)
      const lon = parseFloat(data[0].lon)
      
      if (map) {
        map.setView([lat, lon], 15)
        
        // Supprimer l'ancien marqueur s'il existe
        if (marker) {
          map.removeLayer(marker)
        }
        
        // Créer un nouveau marqueur
        marker = L.marker([lat, lon]).addTo(map)
          .bindPopup(`${props.address.voie}, ${props.address.commune}`)
          .openPopup()
      }
    }
  } catch (error) {
    console.error('Erreur de géocodage:', error)
    // En cas d'erreur, utiliser les coordonnées par défaut
    if (map && !marker) {
      marker = L.marker(defaultCoords).addTo(map)
        .bindPopup(`${props.address.voie}, ${props.address.commune}`)
        .openPopup()
    }
  }
}

onMounted(() => {
  initMap()
  geocodeAddress()
})

watch(() => props.address, () => {
  if (props.address) {
    geocodeAddress()
  }
}, { deep: true })
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

