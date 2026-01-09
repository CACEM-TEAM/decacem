<template>
  <div class="search-container">
    <div class="search-wrapper">
      <Search class="search-icon" />
      <input
        ref="searchInputRef"
        v-model="searchQuery"
        @input="handleSearch"
        @focus="showSuggestions = true"
        @blur="handleBlur"
        @keydown="handleKeydown"
        type="text"
        placeholder="Recherchez votre adresse (quartier, rue, commune)..."
        class="search-input"
        autocomplete="off"
      />
      <button 
        v-if="searchQuery"
        @click="clearSearch"
        class="clear-button"
        aria-label="Effacer la recherche"
      >
        <X class="clear-icon" />
      </button>
      <div v-if="isLoadingBan" class="loading-indicator" aria-label="Recherche en cours">
        <div class="spinner"></div>
      </div>
    </div>

    <!-- Suggestions avec autocomplétion -->
    <Transition name="slide-fade">
      <div v-if="showSuggestions && filteredSuggestions.length > 0" class="suggestions">
        <div
          v-for="(suggestion, index) in filteredSuggestions"
          :key="`${suggestion.COMMUNE}-${suggestion.VOIE}-${suggestion.QUARTIER}-${index}`"
          @mousedown.prevent="selectSuggestion(suggestion)"
          class="suggestion-item"
          :class="{ 'highlighted': index === highlightedIndex }"
        >
          <img 
            src="/images/wired-lineal-18-location-pin-in-jump-dynamic.webp" 
            alt="Localisation" 
            class="suggestion-icon" 
            width="20" 
            height="20" 
            loading="lazy" 
            decoding="async" 
          />
          <div class="suggestion-content">
            <div class="suggestion-voie">
              {{ suggestion.VOIE }}
              <span v-if="suggestion._fromBan" class="ban-badge" title="Résultat de la Base Adresse Nationale">BAN</span>
            </div>
            <div class="suggestion-commune">{{ suggestion.COMMUNE }}</div>
            <div v-if="suggestion.QUARTIER" class="suggestion-quartier">{{ suggestion.QUARTIER }}</div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Message si aucune suggestion -->
    <Transition name="slide-fade">
      <div v-if="showSuggestions && searchQuery && filteredSuggestions.length === 0 && !isLoadingBan" class="no-results">
        <p>Aucun résultat trouvé pour "{{ searchQuery }}"</p>
        <p class="no-results-hint">Essayez avec d'autres mots-clés ou vérifiez l'orthographe</p>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Search, X } from 'lucide-vue-next'
import Fuse from 'fuse.js'

const props = defineProps({
  collectionData: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['select-address'])

// Refs
const searchQuery = ref('')
const showSuggestions = ref(false)
const highlightedIndex = ref(-1)
const banResults = ref([])
const isLoadingBan = ref(false)
const searchInputRef = ref(null)

// Timeouts
let banSearchTimeout = null
let blurTimeout = null

// Cache pour les adresses uniques - calculé une seule fois
const uniqueAddressesCache = ref([])
const fuseInstance = ref(null)

// Cache pour les normalisations (performance)
const normalizationCache = new Map()

// Constantes de configuration
const SEARCH_CONFIG = {
  MIN_QUERY_LENGTH: 2,
  BAN_MIN_QUERY_LENGTH: 3,
  BAN_DEBOUNCE_MS: 500,
  BAN_TIMEOUT_MS: 2000, // Timeout de 2 secondes pour la BAN
  BAN_MAX_RESULTS: 5,
  BAN_API_LIMIT: 15,
  MAX_SUGGESTIONS: 10,
  MIN_SIMILARITY: 30,
  BLUR_DELAY_MS: 200
}

// Précharger l'image de localisation dès le montage
onMounted(() => {
  const img = new Image()
  img.src = '/images/wired-lineal-18-location-pin-in-jump-dynamic.webp'
})

// Nettoyer les timeouts au démontage
onUnmounted(() => {
  if (banSearchTimeout) clearTimeout(banSearchTimeout)
  if (blurTimeout) clearTimeout(blurTimeout)
})

// ========== FONCTIONS UTILITAIRES ==========

/**
 * Normalise une chaîne pour la comparaison (avec cache)
 */
const normalizeForMatch = (str) => {
  if (!str) return ''
  
  // Utiliser le cache si disponible
  if (normalizationCache.has(str)) {
    return normalizationCache.get(str)
  }
  
  const normalized = str.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .replace(/[^a-z0-9]/g, '') // Garder seulement lettres et chiffres
    .trim()
  
  // Mettre en cache (limiter à 1000 entrées pour éviter la fuite mémoire)
  if (normalizationCache.size < 1000) {
    normalizationCache.set(str, normalized)
  }
  
  return normalized
}

/**
 * Calcule le pourcentage de similarité entre deux chaînes (optimisé)
 */
const calculateSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0
  
  const s1 = normalizeForMatch(str1)
  const s2 = normalizeForMatch(str2)
  
  if (s1 === s2) return 100
  
  // Correspondance exacte après normalisation
  if (s1 === s2) return 100
  
  // Si une chaîne contient l'autre complètement
  if (s1.includes(s2) || s2.includes(s1)) {
    const minLen = Math.min(s1.length, s2.length)
    const maxLen = Math.max(s1.length, s2.length)
    return Math.round((minLen / maxLen) * 100)
  }
  
  // Calcul optimisé de similarité basé sur les caractères communs
  const longer = s1.length > s2.length ? s1 : s2
  const shorter = s1.length > s2.length ? s2 : s1
  
  if (longer.length === 0) return 100
  
  // Compter les caractères communs dans l'ordre (algorithme optimisé)
  let matches = 0
  let shorterIndex = 0
  
  for (let i = 0; i < longer.length && shorterIndex < shorter.length; i++) {
    if (longer[i] === shorter[shorterIndex]) {
      matches++
      shorterIndex++
    }
  }
  
  // Score basé sur les correspondances
  const baseScore = (matches / longer.length) * 100
  
  // Bonus pour préfixe commun
  let prefixBonus = 0
  const minPrefix = Math.min(3, shorter.length)
  for (let i = 0; i < minPrefix; i++) {
    if (longer[i] === shorter[i]) {
      prefixBonus += 5
    } else {
      break
    }
  }
  
  return Math.min(100, Math.round(baseScore + prefixBonus))
}

/**
 * Vérifie si une requête correspond à une adresse avec un seuil de similarité
 */
const matchesWithSimilarity = (query, address, minSimilarity = SEARCH_CONFIG.MIN_SIMILARITY) => {
  const queryNormalized = normalizeForMatch(query)
  const queryWords = queryNormalized.split(/\s+/).filter(w => w.length >= 2)
  
  if (queryWords.length === 0) return { match: false, score: 0 }
  
  // Calculer la similarité pour chaque champ (une seule fois)
  const voieScore = calculateSimilarity(query, address.VOIE || '')
  const communeScore = calculateSimilarity(query, address.COMMUNE || '')
  const quartierScore = calculateSimilarity(query, address.QUARTIER || '')
  const searchTextScore = calculateSimilarity(query, address.SEARCH_TEXT || '')
  
  // Pour les recherches multi-mots
  if (queryWords.length > 1) {
    let totalScore = 0
    let matches = 0
    
    for (const word of queryWords) {
      const wordVoieScore = calculateSimilarity(word, address.VOIE || '')
      const wordCommuneScore = calculateSimilarity(word, address.COMMUNE || '')
      const wordQuartierScore = calculateSimilarity(word, address.QUARTIER || '')
      const wordSearchTextScore = calculateSimilarity(word, address.SEARCH_TEXT || '')
      
      const maxWordScore = Math.max(wordVoieScore, wordCommuneScore, wordQuartierScore, wordSearchTextScore)
      
      if (maxWordScore >= minSimilarity) {
        matches++
        totalScore += maxWordScore
      }
    }
    
    if (matches === queryWords.length) {
      return { 
        match: true, 
        score: totalScore / queryWords.length,
        details: { voie: voieScore, commune: communeScore, quartier: quartierScore }
      }
    }
    
    return { match: false, score: 0 }
  }
  
  // Pour un seul mot, prendre le meilleur score
  const maxScore = Math.max(voieScore, communeScore, quartierScore, searchTextScore)
  
  if (maxScore >= minSimilarity) {
    return { 
      match: true, 
      score: maxScore,
      details: { voie: voieScore, commune: communeScore, quartier: quartierScore }
    }
  }
  
  return { match: false, score: 0 }
}

/**
 * Calcule un score pondéré pour une adresse
 */
const calculateWeightedScore = (matchResult) => {
  if (!matchResult.match) return 0
  
  let weightedScore = matchResult.score
  
  if (matchResult.details) {
    // Bonus pour correspondances dans les champs importants
    if (matchResult.details.quartier > 50) weightedScore += 20
    if (matchResult.details.voie > 50) weightedScore += 15
    if (matchResult.details.commune > 50) weightedScore += 10
  }
  
  return weightedScore
}

// ========== INITIALISATION DES DONNÉES ==========

watch(() => props.collectionData, (data) => {
  if (!data?.length || uniqueAddressesCache.value.length > 0) return
  
  const unique = new Map()
  const len = data.length
  
  for (let i = 0; i < len; i++) {
    const item = data[i]
    const commune = item.COMMUNE
    const voie = item.VOIE
    const quartier = item.QUARTIER || ''
    const key = `${commune}|${voie}|${quartier}`
    
    if (!unique.has(key)) {
      // Créer un champ combiné optimisé pour la recherche
      const searchText = [
        quartier,
        voie,
        commune,
        quartier ? `${quartier} ${voie}` : voie,
        quartier ? `${voie} ${quartier}` : voie,
        `${voie} ${commune}`,
        quartier ? `${quartier} ${voie} ${commune}` : `${voie} ${commune}`
      ].filter(Boolean).join(' ').toLowerCase()
      
      unique.set(key, {
        COMMUNE: commune,
        QUARTIER: quartier,
        VOIE: voie,
        commune: commune,
        voie: voie,
        quartier: quartier,
        SEARCH_TEXT: searchText
      })
    }
  }
  
  uniqueAddressesCache.value = Array.from(unique.values())
  
  // Initialiser Fuse.js avec configuration ultra-optimisée pour la vitesse
  if (uniqueAddressesCache.value.length > 0) {
    fuseInstance.value = new Fuse(uniqueAddressesCache.value, {
      keys: [
        { name: 'SEARCH_TEXT', weight: 0.6 }, // Plus de poids sur le texte combiné
        { name: 'QUARTIER', weight: 0.2 },
        { name: 'VOIE', weight: 0.15 },
        { name: 'COMMUNE', weight: 0.05 }
      ],
      threshold: 0.4, // Plus permissif = plus de résultats rapidement
      includeScore: true,
      minMatchCharLength: 2,
      ignoreLocation: true, // Ignorer la position = plus rapide
      findAllMatches: false, // Désactiver pour la vitesse
      shouldSort: true,
      useExtendedSearch: false,
      distance: 50, // Réduire la distance pour la vitesse
      limit: 15 // Limiter les résultats dès la recherche
    })
  }
}, { immediate: true })

// ========== RECHERCHE BAN ==========

/**
 * Vérifie si une adresse BAN correspond à une adresse locale (optimisé)
 */
const matchesLocalAddress = (banAddress) => {
  if (!uniqueAddressesCache.value.length) return false
  
  const banVoie = normalizeForMatch(banAddress.VOIE)
  const banCommune = normalizeForMatch(banAddress.COMMUNE)
  const banQuartier = normalizeForMatch(banAddress.QUARTIER)
  
  // Utiliser some() avec early return pour optimiser
  return uniqueAddressesCache.value.some(local => {
    const localVoie = normalizeForMatch(local.VOIE)
    const localCommune = normalizeForMatch(local.COMMUNE)
    const localQuartier = normalizeForMatch(local.QUARTIER)
    
    // Correspondance exacte commune + voie
    if (banCommune === localCommune && banVoie === localVoie) {
      return true
    }
    
    // Correspondance avec quartier si présent
    if (banQuartier && localQuartier) {
      if (banCommune === localCommune && 
          banQuartier === localQuartier && 
          (banVoie.includes(localVoie) || localVoie.includes(banVoie))) {
        return true
      }
    }
    
    // Correspondance partielle voie (seulement si assez long)
    if (banCommune === localCommune && banVoie.length >= 5 && localVoie.length >= 5) {
      if (banVoie.includes(localVoie) || localVoie.includes(banVoie)) {
        return true
      }
    }
    
    return false
  })
}

/**
 * Recherche dans la BAN avec gestion d'erreur améliorée
 */
const searchBan = async (query) => {
  if (!query || query.length < SEARCH_CONFIG.BAN_MIN_QUERY_LENGTH || !uniqueAddressesCache.value.length) {
    banResults.value = []
    return
  }
  
  isLoadingBan.value = true
  
  try {
    const banQuery = `${query}, Martinique, France`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // Timeout de 5s
    
    const response = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(banQuery)}&limit=${SEARCH_CONFIG.BAN_API_LIMIT}&type=housenumber&type=street`,
      {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      }
    )
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.features && data.features.length > 0) {
      const banAddresses = data.features
        .filter(feature => {
          const context = feature.properties.context || ''
          return context.toLowerCase().includes('martinique') || 
                 feature.properties.city?.toLowerCase().includes('martinique')
        })
        .map(feature => {
          const props = feature.properties
          const label = props.label || ''
          const parts = label.split(',')
          const voie = parts[0]?.trim() || ''
          const commune = props.city || parts[parts.length - 1]?.trim() || ''
          
          return {
            VOIE: voie,
            COMMUNE: commune,
            QUARTIER: props.district || '',
            commune: commune,
            voie: voie,
            quartier: props.district || '',
            _fromBan: true,
            _banScore: props.score || 0,
            _banLabel: label
          }
        })
      
      // Filtrer pour ne garder que les adresses qui existent dans la base locale
      banResults.value = banAddresses
        .filter(banAddr => matchesLocalAddress(banAddr))
        .slice(0, SEARCH_CONFIG.BAN_MAX_RESULTS)
    } else {
      banResults.value = []
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.warn('Erreur recherche BAN:', error)
    }
    banResults.value = []
  } finally {
    isLoadingBan.value = false
  }
}

// ========== RECHERCHE LOCALE OPTIMISÉE ==========

/**
 * Recherche locale rapide avec Fuse.js uniquement (sans calculs coûteux)
 */
const performLocalSearch = (query) => {
  if (!fuseInstance.value) return []
  
  // Recherche Fuse.js seule - très rapide
  const results = fuseInstance.value.search(query)
  
  // Limiter à 15 résultats pour éviter de traiter trop de données
  return results.slice(0, 15).map(result => ({
    ...result.item,
    _fuseScore: result.score || 1
  }))
}

/**
 * Recherche par similarité rapide (seulement si nécessaire, limitée)
 */
const performSimilaritySearch = (query) => {
  const queryLower = query.toLowerCase()
  const queryWords = queryLower.split(/\s+/).filter(w => w.length >= 2)
  
  if (queryWords.length === 0) return []
  
  // Recherche simple par inclusion (beaucoup plus rapide que similarité complète)
  const results = uniqueAddressesCache.value
    .filter(addr => {
      const searchText = addr.SEARCH_TEXT || ''
      
      // Pour multi-mots, tous doivent correspondre
      if (queryWords.length > 1) {
        return queryWords.every(word => searchText.includes(word))
      }
      
      // Pour un seul mot, recherche simple
      return searchText.includes(queryWords[0]) ||
             addr.COMMUNE?.toLowerCase().includes(queryWords[0]) ||
             addr.VOIE?.toLowerCase().includes(queryWords[0]) ||
             addr.QUARTIER?.toLowerCase().includes(queryWords[0])
    })
    .slice(0, 15) // Limiter dès le début
  
  // Trier simple par pertinence (quartier > voie > commune)
  results.sort((a, b) => {
    const aHasQuartier = queryWords.some(w => a.QUARTIER?.toLowerCase().includes(w))
    const bHasQuartier = queryWords.some(w => b.QUARTIER?.toLowerCase().includes(w))
    if (aHasQuartier && !bHasQuartier) return -1
    if (!aHasQuartier && bHasQuartier) return 1
    
    const aHasVoie = queryWords.some(w => a.VOIE?.toLowerCase().includes(w))
    const bHasVoie = queryWords.some(w => b.VOIE?.toLowerCase().includes(w))
    if (aHasVoie && !bHasVoie) return -1
    if (!aHasVoie && bHasVoie) return 1
    
    return 0
  })
  
  return results
}

// ========== COMPUTED PRINCIPAL ==========

const filteredSuggestions = computed(() => {
  // Cas 1: Pas de requête ou pas de données
  if (!searchQuery.value || !fuseInstance.value) {
    return uniqueAddressesCache.value.slice(0, SEARCH_CONFIG.MAX_SUGGESTIONS)
  }
  
  const query = searchQuery.value.trim()
  
  // Cas 2: Requête trop courte
  if (query.length < SEARCH_CONFIG.MIN_QUERY_LENGTH) {
    return uniqueAddressesCache.value.slice(0, SEARCH_CONFIG.MAX_SUGGESTIONS)
  }
  
  // PRIORITÉ 1: Recherche locale rapide avec Fuse.js (ultra-rapide)
  let localResults = performLocalSearch(query)
  
  // Si Fuse.js n'a pas assez de résultats ou score trop faible, ajouter recherche simple
  const needsMoreResults = localResults.length < 5 || (localResults.length > 0 && localResults[0]._fuseScore > 0.7)
  const isMultiWord = query.split(/\s+/).length > 1
  
  if (needsMoreResults || isMultiWord) {
    const similarityResults = performSimilaritySearch(query)
    
    // Combiner rapidement en évitant les doublons
    const existingKeys = new Set(localResults.map(r => `${r.COMMUNE}|${r.VOIE}|${r.QUARTIER}`))
    
    for (const addr of similarityResults) {
      if (localResults.length >= SEARCH_CONFIG.MAX_SUGGESTIONS) break
      
      const key = `${addr.COMMUNE}|${addr.VOIE}|${addr.QUARTIER}`
      if (!existingKeys.has(key)) {
        localResults.push(addr)
        existingKeys.add(key)
      }
    }
    
    // Trier simple par score Fuse (les meilleurs en premier)
    localResults.sort((a, b) => {
      const scoreA = a._fuseScore !== undefined ? a._fuseScore : 1
      const scoreB = b._fuseScore !== undefined ? b._fuseScore : 1
      return scoreA - scoreB // Fuse.js : plus bas = meilleur
    })
  }
  
  // PRIORITÉ 2: Ajouter résultats BAN (seulement s'ils existent déjà, ne pas attendre)
  const combinedResults = [...localResults.slice(0, SEARCH_CONFIG.MAX_SUGGESTIONS)]
  
  // Ajouter résultats BAN seulement s'il y a de la place et qu'ils existent
  if (combinedResults.length < SEARCH_CONFIG.MAX_SUGGESTIONS && banResults.value.length > 0) {
    for (const banResult of banResults.value) {
      if (combinedResults.length >= SEARCH_CONFIG.MAX_SUGGESTIONS) break
      
      const banVoie = normalizeForMatch(banResult.VOIE)
      const banCommune = normalizeForMatch(banResult.COMMUNE)
      
      const isDuplicate = combinedResults.some(local => {
        const localVoie = normalizeForMatch(local.VOIE)
        const localCommune = normalizeForMatch(local.COMMUNE)
        return banCommune === localCommune && banVoie === localVoie
      })
      
      if (!isDuplicate) {
        combinedResults.push(banResult)
      }
    }
  }
  
  // Trier final simple : locaux d'abord (déjà triés), puis BAN
  combinedResults.sort((a, b) => {
    // Prioriser les résultats locaux
    if (a._fromBan && !b._fromBan) return 1
    if (!a._fromBan && b._fromBan) return -1
    
    // Si tous les deux sont BAN, trier par score BAN
    if (a._fromBan && b._fromBan) {
      return (b._banScore || 0) - (a._banScore || 0)
    }
    
    // Si tous les deux sont locaux, utiliser le score Fuse (déjà trié)
    return 0
  })
  
  return combinedResults.slice(0, SEARCH_CONFIG.MAX_SUGGESTIONS)
})

// ========== GESTION DES ÉVÉNEMENTS ==========

const handleSearch = () => {
  showSuggestions.value = true
  highlightedIndex.value = -1
  
  // Recherche BAN en arrière-plan avec debounce (ne bloque pas l'affichage local)
  if (banSearchTimeout) {
    clearTimeout(banSearchTimeout)
  }
  
  const query = searchQuery.value.trim()
  if (query.length >= SEARCH_CONFIG.BAN_MIN_QUERY_LENGTH) {
    // Debounce pour la BAN - si l'utilisateur tape encore, on annule
    banSearchTimeout = setTimeout(() => {
      // Vérifier que la requête n'a pas changé pendant le debounce
      if (searchQuery.value.trim() === query) {
        searchBan(query)
      }
    }, SEARCH_CONFIG.BAN_DEBOUNCE_MS)
  } else {
    banResults.value = []
    isLoadingBan.value = false
  }
}

const handleBlur = () => {
  // Délai pour permettre le clic sur une suggestion
  blurTimeout = setTimeout(() => {
    showSuggestions.value = false
  }, SEARCH_CONFIG.BLUR_DELAY_MS)
}

const handleKeydown = (event) => {
  if (!showSuggestions.value || filteredSuggestions.value.length === 0) return
  
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      highlightedIndex.value = Math.min(
        highlightedIndex.value + 1,
        filteredSuggestions.value.length - 1
      )
      break
    case 'ArrowUp':
      event.preventDefault()
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, -1)
      break
    case 'Enter':
      event.preventDefault()
      if (highlightedIndex.value >= 0 && highlightedIndex.value < filteredSuggestions.value.length) {
        selectSuggestion(filteredSuggestions.value[highlightedIndex.value])
      }
      break
    case 'Escape':
      event.preventDefault()
      showSuggestions.value = false
      searchInputRef.value?.blur()
      break
  }
}

const selectSuggestion = (suggestion) => {
  // Si c'est une adresse BAN, trouver l'adresse locale correspondante
  let addressToSelect = suggestion
  
  if (suggestion._fromBan) {
    const banVoie = normalizeForMatch(suggestion.VOIE)
    const banCommune = normalizeForMatch(suggestion.COMMUNE)
    const banQuartier = normalizeForMatch(suggestion.QUARTIER)
    
    const localMatch = uniqueAddressesCache.value.find(local => {
      const localVoie = normalizeForMatch(local.VOIE)
      const localCommune = normalizeForMatch(local.COMMUNE)
      const localQuartier = normalizeForMatch(local.QUARTIER)
      
      // Correspondance exacte
      if (banCommune === localCommune && banVoie === localVoie) {
        return true
      }
      
      // Correspondance avec quartier
      if (banQuartier && localQuartier) {
        if (banCommune === localCommune && 
            banQuartier === localQuartier && 
            (banVoie.includes(localVoie) || localVoie.includes(banVoie))) {
          return true
        }
      }
      
      // Correspondance partielle
      if (banCommune === localCommune && banVoie.length >= 5 && localVoie.length >= 5) {
        if (banVoie.includes(localVoie) || localVoie.includes(banVoie)) {
          return true
        }
      }
      
      return false
    })
    
    if (localMatch) {
      addressToSelect = localMatch
    }
  }
  
  searchQuery.value = `${addressToSelect.VOIE}, ${addressToSelect.COMMUNE}`
  showSuggestions.value = false
  highlightedIndex.value = -1
  
  emit('select-address', {
    commune: addressToSelect.COMMUNE,
    voie: addressToSelect.VOIE,
    quartier: addressToSelect.QUARTIER || ''
  })
}

const clearSearch = () => {
  searchQuery.value = ''
  showSuggestions.value = false
  highlightedIndex.value = -1
  banResults.value = []
  
  if (banSearchTimeout) {
    clearTimeout(banSearchTimeout)
    banSearchTimeout = null
  }
  
  emit('select-address', null)
  
  // Remettre le focus sur l'input
  nextTick(() => {
    searchInputRef.value?.focus()
  })
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
  transition: border-color 0.2s, background 0.2s;
  z-index: 1;
}

.search-wrapper:focus-within {
  border-color: var(--primary);
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-icon {
  width: 1.25rem;
  height: 1.25rem;
  margin-right: 0.75rem;
  opacity: 0.5;
  flex-shrink: 0;
  color: var(--text-secondary);
  transition: opacity 0.2s;
}

.search-wrapper:focus-within .search-icon {
  opacity: 0.7;
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
  transition: background 0.2s, color 0.2s;
}

.clear-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.clear-button:hover {
  background: #f1f5f9;
  color: var(--text-primary);
}

.clear-button:active {
  transform: scale(0.95);
}

.loading-indicator {
  margin-left: 0.5rem;
  display: flex;
  align-items: center;
}

.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid #e2e8f0;
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
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
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f1f5f9;
}

.suggestions::-webkit-scrollbar {
  width: 6px;
}

.suggestions::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.suggestions::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.suggestions::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.suggestion-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid var(--border);
  contain: layout style paint;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover,
.suggestion-item.highlighted {
  background: #f8fafc;
}

.suggestion-item:active {
  background: #f1f5f9;
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
  display: block;
}

.suggestion-content {
  flex: 1;
  min-width: 0;
}

.suggestion-voie {
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
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

.ban-badge {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  background: #e0f2fe;
  color: #0369a1;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.no-results {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  right: 0;
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  color: var(--text-secondary);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border);
  z-index: 9999;
  isolation: isolate;
}

.no-results p {
  margin: 0;
}

.no-results-hint {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  opacity: 0.7;
}

/* Transitions */
.slide-fade-enter-active {
  transition: all 0.2s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.15s ease-in;
}

.slide-fade-enter-from {
  transform: translateY(-10px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
</style>
