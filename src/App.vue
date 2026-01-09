<template>
  <div class="app-container">
    <!-- Header Moderne -->
    <header class="app-header">
      <div class="header-content">
        <div class="header-top">
          <div class="header-text">
            <h1 class="app-title">
              <span class="title-letter-with-logo">
                <img src="/images/cacem_fav-300x300-1.jpeg" alt="Logo CACEM" class="title-logo" width="48" height="48" loading="lazy" decoding="async" />
                <span class="title-letter">C</span>
                <span class="title-letter">A</span>
                <span class="title-letter">C</span>
                <span class="title-letter">E</span>
                <span class="title-letter">M</span>
              </span>
            </h1>
            <p class="app-subtitle">{{ addresses.length }} adresses disponibles</p>
          </div>
        </div>
      </div>
    </header>

    <div class="main-content">
      <!-- Search Section -->
      <section class="search-section">
        <div class="search-card">
          <div class="search-header">
            <div class="search-title-wrapper">
              <img src="/images/wired-lineal-63-home-hover-3d-roll.webp" alt="Accueil" class="search-title-icon" width="32" height="32" loading="lazy" decoding="async" />
              <h2 class="section-title">Rechercher une adresse</h2>
            </div>
            <p class="section-subtitle">Trouvez les dates de collecte pour votre adresse</p>
          </div>
          <SearchBar 
            :collection-data="collectionData"
            @select-address="handleAddressSelect"
          />
          <div v-if="error" class="error-state">
            <AlertCircle class="error-icon" />
            <span>{{ error }}</span>
          </div>
        </div>
      </section>

      <!-- Results Section -->
      <section v-if="selectedAddress" class="results-section">
        <div class="section-header">
          <h2 class="section-title">Informations de collecte</h2>
          <div class="selected-address-badge">
            <img src="/images/wired-lineal-18-location-pin-in-jump-dynamic.webp" alt="Localisation" class="badge-icon" width="16" height="16" loading="lazy" decoding="async" />
            <span>{{ selectedAddress.voie }}, {{ selectedAddress.commune }}</span>
          </div>
        </div>

        <div class="content-grid">
          <div class="map-card">
            <MapDisplay :address="selectedAddress" />
          </div>
          
          <div class="calendar-card">
            <CalendarDisplay 
              :collection-data="filteredCollectionData"
              :selected-address="selectedAddress"
            />
          </div>
        </div>

        <!-- Message si aucune donnée -->
        <div v-if="filteredCollectionData.length === 0" class="empty-state">
          <div class="empty-content">
            <Inbox class="empty-icon" />
            <h3>Aucune collecte trouvée</h3>
            <p>Il n'y a pas de données de collecte pour cette adresse.</p>
          </div>
        </div>

      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject, defineAsyncComponent } from 'vue'
import { AlertCircle, Inbox } from 'lucide-vue-next'
import SearchBar from './components/SearchBar.vue'
// Lazy loading des composants non critiques pour améliorer le First Load
const MapDisplay = defineAsyncComponent(() => import('./components/MapDisplay.vue'))
const CalendarDisplay = defineAsyncComponent(() => import('./components/CalendarDisplay.vue'))

// Récupérer les données déjà chargées depuis main.js
const initialData = inject('initialData', [])

const addresses = ref([])
const collectionData = ref([])
const selectedAddress = ref(null)
const loading = ref(false) // Plus besoin de charger, les données sont déjà là
const error = ref(null)

const filteredCollectionData = computed(() => {
  if (!selectedAddress.value) return []
  
  return collectionData.value.filter(item => 
    item.COMMUNE === selectedAddress.value.commune &&
    item.VOIE === selectedAddress.value.voie
  )
})

const handleAddressSelect = (address) => {
  selectedAddress.value = address
  // Scroll vers les résultats
  if (address) {
    setTimeout(() => {
      const element = document.querySelector('.content-grid, .empty-state')
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }
}

// Fonction ultra-optimisée pour extraire les adresses uniques
const extractAddresses = (data) => {
  const uniqueAddresses = new Map()
  const len = data.length
  
  // Boucle ultra-optimisée - pas de template literals dans la boucle
  for (let i = 0; i < len; i++) {
    const item = data[i]
    const commune = item.COMMUNE
    const voie = item.VOIE
    const key = commune + '|' + voie // Plus rapide que template literal
    
    if (!uniqueAddresses.has(key)) {
      uniqueAddresses.set(key, {
        commune: commune,
        voie: voie,
        quartier: item.QUARTIER || ''
      })
    }
  }
  
  addresses.value = Array.from(uniqueAddresses.values())
}

// Traitement des données - différé pour ne pas bloquer le rendu
const processData = (data) => {
  // Assigner immédiatement pour que l'UI soit disponible
  collectionData.value = data
  
  // Extraire les adresses de manière asynchrone pour ne pas bloquer
  if (window.requestIdleCallback) {
    requestIdleCallback(() => extractAddresses(data), { timeout: 100 })
  } else {
    setTimeout(() => extractAddresses(data), 0)
  }
}

// Détecter les connexions lentes et désactiver les animations
const isSlowConnection = ref(false)

onMounted(() => {
  // Détecter la connexion lente
  if ('connection' in navigator) {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    if (connection) {
      isSlowConnection.value = connection.effectiveType === 'slow-2g' || 
                                connection.effectiveType === '2g' ||
                                (connection.saveData === true)
      
      // Ajouter une classe au body pour désactiver les animations CSS
      if (isSlowConnection.value) {
        document.body.classList.add('slow-connection')
      }
    }
  }
  
  if (initialData?.length > 0) {
    processData(initialData)
  } else {
    error.value = 'Aucune donnée disponible. Veuillez rafraîchir la page.'
  }
})
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  position: relative;
}

/* Header épuré */
.app-header {
  position: sticky;
  top: 0;
  padding: 1.25rem 1.5rem;
  background: #ffffff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  z-index: 100;
  backdrop-filter: blur(10px);
  transition: box-shadow 0.3s ease;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.header-top {
  display: flex;
  align-items: center;
  width: 100%;
}

.header-text {
  flex: 1;
  min-width: 0;
  width: 100%;
}

.app-title {
  font-size: 2em;
  font-weight: 480;
  margin: 0;
  color: #565656;
  line-height: 1.3;
  display: flex;
  align-items: center;
  gap: 0.15em;
  letter-spacing: -0.05em;
}

.title-letter-with-logo {
  position: relative;
  display: inline-block;
  line-height: 1;
  animation: fadeInSlide 0.8s ease-out;
}

.title-logo {
  position: absolute;
  left: -0.9em;
  top: 56%;
  transform: translateY(-50%);
  width: 1.2em;
  height: 1.2em;
  object-fit: contain;
  z-index: 1;
  opacity: 0.9;
  animation: logoFloat 8s ease-in-out infinite;
}

.title-letter {
  position: relative;
  display: inline-block;
  z-index: 2;
  letter-spacing: -0.05em;
  animation: letterFadeIn 0.6s ease-out forwards, letterFloat 8s ease-in-out infinite;
  opacity: 0;
}

.title-letter:hover {
  transform: translateY(-3px);
}

.title-letter-with-logo .title-letter:nth-child(2) { 
  animation-delay: 0.1s, 0.7s; 
}
.title-letter-with-logo .title-letter:nth-child(3) { 
  animation-delay: 0.2s, 0.8s; 
}
.title-letter-with-logo .title-letter:nth-child(4) { 
  animation-delay: 0.3s, 0.9s; 
}
.title-letter-with-logo .title-letter:nth-child(5) { 
  animation-delay: 0.4s, 1s; 
}
.title-letter-with-logo .title-letter:nth-child(6) { 
  animation-delay: 0.5s, 1.1s; 
}

.title-rest {
  display: inline-block;
}

/* Animations pour le titre */
@keyframes fadeInSlide {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes logoFloat {
  0%, 100% {
    transform: translateY(-50%) translateY(0) rotate(0deg);
  }
  25% {
    transform: translateY(-50%) translateY(-3px) rotate(2deg);
  }
  50% {
    transform: translateY(-50%) translateY(-5px) rotate(0deg);
  }
  75% {
    transform: translateY(-50%) translateY(-3px) rotate(-2deg);
  }
}

@keyframes letterFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes letterFloat {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}

.app-subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0.25rem 0 0 0;
  font-weight: 400;
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  position: relative;
  z-index: 1;
  width: 100%;
}

/* Search Section */
.search-section {
  margin-top: 0;
}

.search-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid var(--border);
  position: relative;
  z-index: 1;
}

.search-header {
  margin-bottom: 1.5rem;
}

.search-title-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.search-title-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
  flex-shrink: 0;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.3;
}

.section-subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
  font-weight: 400;
}

/* Results Section */
.results-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.selected-address-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #ffffff;
  border-radius: 20px;
  font-size: 0.875rem;
  color: #000000;
  font-weight: 500;
  border: 1px solid var(--border);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.badge-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  object-fit: contain;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  width: 100%;
}

.map-card,
.calendar-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid var(--border);
  position: relative;
  z-index: 1;
  width: 100%;
  min-height: 300px;
}

@media (min-width: 768px) {
  .content-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
}

.flux-section {
  margin-top: 1rem;
}

/* Loading & Error States */
.loading-state,
.error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
  margin-top: 1rem;
  border-radius: var(--radius);
}

.loading-state {
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.loading-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
}

.progress-bar {
  width: 100%;
  max-width: 400px;
  height: 8px;
  background: var(--bg-secondary);
  border-radius: var(--radius-full);
  overflow: hidden;
  box-shadow: var(--shadow-inner);
}

.progress-fill {
  height: 100%;
  background: var(--primary-gradient);
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
  box-shadow: 0 0 10px rgba(249, 115, 22, 0.5);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state {
  color: var(--danger);
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.2);
  border-radius: var(--radius);
  padding: 1rem 1.5rem;
  margin-top: 1rem;
}

.error-icon {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
}

.empty-state {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 4rem 2rem;
  text-align: center;
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.empty-icon {
  width: 4rem;
  height: 4rem;
  opacity: 0.4;
  color: var(--text-secondary);
}

.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
}

.empty-state p {
  font-size: 0.95rem;
  color: var(--text-secondary);
}

/* Responsive simple */
@media (max-width: 768px) {
  .app-header {
    padding: 1rem;
  }
  
  .main-content {
    padding: 1.5rem 1rem;
    gap: 1.5rem;
  }
  
  .app-title {
    font-size: 1.25rem;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .search-card,
  .map-card,
  .calendar-card {
    padding: 1.25rem;
  }
  
  .section-title {
    font-size: 1.125rem;
  }
}

/* Désactiver les animations pour les connexions lentes */
body.slow-connection .title-letter,
body.slow-connection .title-logo,
body.slow-connection .title-letter-with-logo {
  animation: none !important;
}

body.slow-connection * {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
}

/* Garder uniquement les transitions essentielles */
body.slow-connection .search-wrapper:focus-within,
body.slow-connection .suggestion-item:hover {
  transition: background 0.1s ease;
}
</style>

