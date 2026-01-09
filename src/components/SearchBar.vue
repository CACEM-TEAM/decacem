<template>
  <div class="search-container">
    <div class="search-wrapper">
      <Search class="search-icon" />
      <input
        v-model="searchQuery"
        @input="handleSearch"
        @focus="showSuggestions = true"
        @blur="handleBlur"
        type="text"
        placeholder="Recherchez votre adresse (commune, voie)..."
        class="search-input"
      />
      <button 
        v-if="searchQuery"
        @click="clearSearch"
        class="clear-button"
      >
        <X class="clear-icon" />
      </button>
    </div>

    <!-- Suggestions avec autocomplétion -->
    <div v-if="showSuggestions && filteredSuggestions.length > 0" class="suggestions">
      <div
        v-for="(suggestion, index) in filteredSuggestions"
        :key="index"
        @mousedown="selectSuggestion(suggestion)"
        class="suggestion-item"
        :class="{ 'highlighted': index === highlightedIndex }"
      >
        <img src="/images/wired-lineal-18-location-pin-in-jump-dynamic.webp" alt="Localisation" class="suggestion-icon" width="20" height="20" loading="lazy" decoding="async" />
        <div class="suggestion-content">
          <div class="suggestion-voie">{{ suggestion.VOIE }}</div>
          <div class="suggestion-commune">{{ suggestion.COMMUNE }}</div>
          <div v-if="suggestion.QUARTIER" class="suggestion-quartier">{{ suggestion.QUARTIER }}</div>
        </div>
      </div>
    </div>

    <!-- Message si aucune suggestion -->
    <div v-if="showSuggestions && searchQuery && filteredSuggestions.length === 0" class="no-results">
      Aucun résultat trouvé pour "{{ searchQuery }}"
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Search, X } from 'lucide-vue-next'
import Fuse from 'fuse.js'

const props = defineProps({
  collectionData: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['select-address'])

const searchQuery = ref('')
const showSuggestions = ref(false)
const highlightedIndex = ref(-1)

// Précharger l'image de localisation dès le montage pour un affichage immédiat
onMounted(() => {
  const img = new Image()
  img.src = '/images/wired-lineal-18-location-pin-in-jump-dynamic.webp'
})

// Cache pour les adresses uniques - calculé une seule fois
const uniqueAddressesCache = ref([])
const fuseInstance = ref(null)

// Extraire les adresses une seule fois au montage
watch(() => props.collectionData, (data) => {
  if (!data?.length || uniqueAddressesCache.value.length > 0) return
  
  const unique = new Map()
  const len = data.length
  
  for (let i = 0; i < len; i++) {
    const item = data[i]
    const commune = item.COMMUNE
    const voie = item.VOIE
    const quartier = item.QUARTIER || ''
    const key = commune + '|' + voie + '|' + quartier
    
    if (!unique.has(key)) {
      unique.set(key, {
        COMMUNE: commune,
        QUARTIER: quartier,
        VOIE: voie,
        commune: commune,
        voie: voie,
        quartier: quartier
      })
    }
  }
  
  uniqueAddressesCache.value = Array.from(unique.values())
  
  // Initialiser Fuse une seule fois
  if (uniqueAddressesCache.value.length > 0) {
    fuseInstance.value = new Fuse(uniqueAddressesCache.value, {
      keys: [
        { name: 'COMMUNE', weight: 0.4 },
        { name: 'QUARTIER', weight: 0.3 },
        { name: 'VOIE', weight: 0.3 }
      ],
      threshold: 0.3,
      includeScore: true,
      minMatchCharLength: 1,
      ignoreLocation: true,
      findAllMatches: true,
      shouldSort: true
    })
  }
}, { immediate: true })

const filteredSuggestions = computed(() => {
  if (!searchQuery.value || !fuseInstance.value) {
    return uniqueAddressesCache.value.slice(0, 10)
  }
  
  const results = fuseInstance.value.search(searchQuery.value)
  let finalResults = results.map(result => result.item)
  
  if (finalResults.length === 0 && searchQuery.value.length >= 2) {
    const queryLower = searchQuery.value.toLowerCase()
    finalResults = uniqueAddressesCache.value.filter(addr => {
      return addr.COMMUNE?.toLowerCase().includes(queryLower) ||
             addr.VOIE?.toLowerCase().includes(queryLower) ||
             addr.QUARTIER?.toLowerCase().includes(queryLower)
    })
  }
  
  return finalResults.slice(0, 10)
})

const handleSearch = () => {
  showSuggestions.value = true
  highlightedIndex.value = -1
}

const handleBlur = () => {
  // Délai pour permettre le clic sur une suggestion
  setTimeout(() => {
    showSuggestions.value = false
  }, 200)
}

const selectSuggestion = (suggestion) => {
  searchQuery.value = suggestion.VOIE + ', ' + suggestion.COMMUNE
  showSuggestions.value = false
  emit('select-address', {
    commune: suggestion.COMMUNE,
    voie: suggestion.VOIE,
    quartier: suggestion.QUARTIER || ''
  })
}

const clearSearch = () => {
  searchQuery.value = ''
  showSuggestions.value = false
  emit('select-address', null)
}
</script>

<style scoped>
.search-container {
  position: relative;
  width: 100%;
  z-index: 1000;
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: #f8fafc;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  transition: border-color 0.2s;
  z-index: 1;
}

.search-wrapper:focus-within {
  border-color: var(--primary);
  background: #ffffff;
}

.search-icon {
  width: 1.25rem;
  height: 1.25rem;
  margin-right: 0.75rem;
  opacity: 0.5;
  flex-shrink: 0;
  color: var(--text-secondary);
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 1rem;
  color: var(--text-primary);
  min-width: 0;
}

.search-input::placeholder {
  color: var(--text-muted);
}

.clear-button {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.25rem;
  margin-left: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 4px;
}

.clear-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.clear-button:hover {
  background: #f1f5f9;
  color: var(--text-primary);
}

.suggestions {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  right: 0;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05);
  max-height: 300px;
  overflow-y: auto;
  z-index: 9999;
  border: 1px solid var(--border);
  margin-top: 0.5rem;
  transform: translateZ(0);
  isolation: isolate;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.suggestion-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid var(--border);
  contain: layout style paint;
}

.suggestion-item .suggestion-icon {
  min-width: 1.25rem;
  min-height: 1.25rem;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover,
.suggestion-item.highlighted {
  background: #f8fafc;
}

.suggestion-icon {
  width: 1.25rem;
  height: 1.25rem;
  margin-right: 0.75rem;
  opacity: 0.8;
  flex-shrink: 0;
  object-fit: contain;
  transform: translateZ(0);
  will-change: contents;
  backface-visibility: hidden;
  -webkit-transform: translateZ(0);
  display: block;
  visibility: visible;
}

.suggestion-content {
  flex: 1;
}

.suggestion-voie {
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
  font-size: 1rem;
}

.suggestion-commune {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 0.125rem;
}

.suggestion-quartier {
  font-size: 0.8rem;
  color: var(--text-secondary);
  opacity: 0.7;
}

.no-results {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  right: 0;
  background: var(--bg-primary);
  border-radius: var(--radius);
  padding: 1.5rem;
  text-align: center;
  color: var(--text-secondary);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border);
  z-index: 9999;
  isolation: isolate;
}
</style>

