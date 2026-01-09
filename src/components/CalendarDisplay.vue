<template>
  <div class="calendar-container">
    <div class="calendar-header-section">
      <h3 class="calendar-title">
        <Calendar class="title-icon" />
        Calendrier de Collecte
      </h3>
      
      <div class="legend legend-top">
        <div class="legend-items">
          <div
            v-for="flux in uniqueFluxes"
            :key="flux"
            class="legend-item"
          >
            <span class="legend-color" :class="getFluxClass(flux)"></span>
            <span>{{ flux }} - {{ getFluxLabel(flux) }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="calendar-wrapper">
      <div class="calendar-header">
        <button @click="previousMonth" class="nav-button">
          <ChevronLeft />
        </button>
        <div class="month-year">
          {{ isMobile ? currentMonthName : `${currentMonthName} ${currentYear}` }}
        </div>
        <button @click="nextMonth" class="nav-button">
          <ChevronRight />
        </button>
      </div>

      <div class="calendar-grid">
        <div class="day-header" v-for="day in daysOfWeek" :key="day">
          {{ day }}
        </div>
        
         <div
           v-for="(day, index) in calendarDays"
           :key="index"
           class="calendar-day"
           :class="{
             'other-month': !day.isCurrentMonth,
             'today': day.isToday,
             'has-collection': day.collections.length > 0
           }"
         >
           <div class="day-content">
             <div v-if="isMobile" class="day-name">{{ getShortDayName(day.date) }}</div>
             <div class="day-number">{{ day.day }}</div>
           </div>
           <div v-if="day.collections.length > 0" class="day-collections">
             <div
               v-for="(collection, idx) in day.collections"
               :key="idx"
               class="collection-dot"
               :class="getFluxClass(collection.FLUX)"
               :title="`${collection.FLUX} - ${getFluxLabel(collection.FLUX)}`"
             ></div>
           </div>
         </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  collectionData: {
    type: Array,
    default: () => []
  },
  selectedAddress: {
    type: Object,
    default: null
  }
})

const currentDate = ref(new Date())
const currentMonth = ref(new Date().getMonth())
const currentYear = ref(new Date().getFullYear())

// Pour le mode mobile : date de départ de la période de 2 semaines
const startDateForWeeks = ref(new Date())

// Détecter si on est sur mobile
const isMobile = ref(window.innerWidth <= 768)

// Mettre à jour la détection mobile lors du redimensionnement
const updateMobileView = () => {
  isMobile.value = window.innerWidth <= 768
  if (isMobile.value && !startDateForWeeks.value) {
    startDateForWeeks.value = new Date()
  }
}

window.addEventListener('resize', updateMobileView)

const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const currentMonthName = computed(() => {
  if (isMobile.value) {
    // Sur mobile, afficher la période (semaines)
    const start = startDateForWeeks.value
    const end = new Date(start)
    end.setDate(end.getDate() + 13) // 14 jours au total (jour 0 à jour 13)
    
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ]
    
    if (start.getMonth() === end.getMonth()) {
      return `${months[start.getMonth()]} ${start.getFullYear()}`
    } else {
      return `${months[start.getMonth()]} - ${months[end.getMonth()]} ${start.getFullYear()}`
    }
  }
  
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]
  return months[currentMonth.value]
})

const uniqueFluxes = computed(() => {
  const fluxes = new Set()
  props.collectionData.forEach(item => {
    fluxes.add(item.FLUX)
  })
  return Array.from(fluxes)
})

const parseDate = (dateString) => {
  // Format: "12-11-2025"
  const [day, month, year] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const isSameDay = (date1, date2) => {
  return date1.getDate() === date2.getDate() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getFullYear() === date2.getFullYear()
}

const getDayOfWeekName = (date) => {
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
  return days[date.getDay()]
}

const getShortDayName = (date) => {
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  return days[date.getDay()]
}

const isWeekEven = (date) => {
  // Calculer le numéro de semaine ISO (semaine commence le lundi)
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  return weekNo % 2 === 0
}

const getCollectionsForDate = (date) => {
  const collections = []
  const dayOfWeekName = getDayOfWeekName(date)
  const isEven = isWeekEven(date)
  
  props.collectionData.forEach(item => {
    // Format V2: dates exactes dans semainePaire/semaineImpaire
    if (item.semainePaire || item.semaineImpaire) {
      if (isEven && item.semainePaire) {
        item.semainePaire.forEach(dateStr => {
          const collectionDate = parseDate(dateStr)
          if (isSameDay(collectionDate, date)) {
            collections.push(item)
          }
        })
      }
      if (!isEven && item.semaineImpaire) {
        item.semaineImpaire.forEach(dateStr => {
          const collectionDate = parseDate(dateStr)
          if (isSameDay(collectionDate, date)) {
            collections.push(item)
          }
        })
      }
    }
    // Format V1: jours de la semaine dans jourSemainePaire/jourSemaineImpaire
    else if (item.jourSemainePaire || item.jourSemaineImpaire) {
      if (isEven && item.jourSemainePaire) {
        const jours = Array.isArray(item.jourSemainePaire) 
          ? item.jourSemainePaire 
          : [item.jourSemainePaire]
        if (jours.includes(dayOfWeekName)) {
          collections.push(item)
        }
      }
      if (!isEven && item.jourSemaineImpaire) {
        const jours = Array.isArray(item.jourSemaineImpaire) 
          ? item.jourSemaineImpaire 
          : [item.jourSemaineImpaire]
        if (jours.includes(dayOfWeekName)) {
          collections.push(item)
        }
      }
    }
  })
  
  return collections
}

const calendarDays = computed(() => {
  const today = new Date()
  const days = []
  
  if (isMobile.value) {
    // Mode mobile : afficher 2 semaines (14 jours) à partir de startDateForWeeks
    const startDate = new Date(startDateForWeeks.value)
    
    // Trouver le lundi de la semaine de startDate
    // 0 = dimanche, 1 = lundi, etc.
    const startDayOfWeek = startDate.getDay()
    // Calculer le décalage pour arriver au lundi
    // Si dimanche (0), on recule de 6 jours
    // Sinon, on recule de (jour - 1) jours
    const mondayOffset = startDayOfWeek === 0 ? -6 : 1 - startDayOfWeek
    
    const firstDay = new Date(startDate)
    firstDay.setDate(startDate.getDate() + mondayOffset)
    firstDay.setHours(0, 0, 0, 0) // Normaliser l'heure
    
    // Générer 14 jours (2 semaines complètes)
    for (let i = 0; i < 14; i++) {
      const date = new Date(firstDay)
      date.setDate(firstDay.getDate() + i)
      
      days.push({
        day: date.getDate(),
        date,
        isCurrentMonth: true, // Toujours afficher les jours en mode mobile
        isToday: isSameDay(date, today),
        collections: getCollectionsForDate(date)
      })
    }
  } else {
    // Mode desktop : afficher le mois complet
    const year = currentYear.value
    const month = currentMonth.value
    
    // Premier jour du mois
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    // Jour de la semaine du premier jour (0 = dimanche, on convertit pour lundi = 0)
    let startDay = firstDay.getDay()
    startDay = startDay === 0 ? 6 : startDay - 1
    
    // Jours du mois précédent
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startDay - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i
      const date = new Date(year, month - 1, day)
      days.push({
        day,
        date,
        isCurrentMonth: false,
        isToday: isSameDay(date, today),
        collections: []
      })
    }
    
    // Jours du mois actuel
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day)
      days.push({
        day,
        date,
        isCurrentMonth: true,
        isToday: isSameDay(date, today),
        collections: getCollectionsForDate(date)
      })
    }
    
    // Jours du mois suivant pour compléter la grille
    const remainingDays = 42 - days.length // 6 semaines * 7 jours
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day)
      days.push({
        day,
        date,
        isCurrentMonth: false,
        isToday: isSameDay(date, today),
        collections: []
      })
    }
  }
  
  return days
})

const getFluxClass = (flux) => {
  const classes = {
    'DEEE': 'flux-deee',
    'DV': 'flux-dv',
    'ENC': 'flux-enc',
    'OM': 'flux-om',
    'RS': 'flux-rs'
  }
  return classes[flux] || 'flux-default'
}

const getFluxLabel = (flux) => {
  const labels = {
    'DEEE': 'Équipements Électriques',
    'DV': 'Déchets Verts',
    'ENC': 'Encombrants',
    'OM': 'Ordures Ménagères',
    'RS': 'Recyclables Secs'
  }
  return labels[flux] || flux
}

const previousMonth = () => {
  if (isMobile.value) {
    // Sur mobile, reculer de 2 semaines
    const newDate = new Date(startDateForWeeks.value)
    newDate.setDate(newDate.getDate() - 14)
    newDate.setHours(0, 0, 0, 0)
    startDateForWeeks.value = newDate
  } else {
    // Sur desktop, reculer d'un mois
    if (currentMonth.value === 0) {
      currentMonth.value = 11
      currentYear.value--
    } else {
      currentMonth.value--
    }
  }
}

const nextMonth = () => {
  if (isMobile.value) {
    // Sur mobile, avancer de 2 semaines
    const newDate = new Date(startDateForWeeks.value)
    newDate.setDate(newDate.getDate() + 14)
    newDate.setHours(0, 0, 0, 0)
    startDateForWeeks.value = newDate
  } else {
    // Sur desktop, avancer d'un mois
    if (currentMonth.value === 11) {
      currentMonth.value = 0
      currentYear.value++
    } else {
      currentMonth.value++
    }
  }
}

watch(() => props.selectedAddress, () => {
  // Réinitialiser au mois actuel quand l'adresse change
  const now = new Date()
  currentMonth.value = now.getMonth()
  currentYear.value = now.getFullYear()
  // Sur mobile, réinitialiser à aujourd'hui
  if (isMobile.value) {
    startDateForWeeks.value = new Date(now)
  }
})

// Initialiser la date de départ mobile à aujourd'hui
onMounted(() => {
  const now = new Date()
  // Initialiser à aujourd'hui, la logique de calendarDays trouvera automatiquement le lundi
  startDateForWeeks.value = new Date(now)
  startDateForWeeks.value.setHours(0, 0, 0, 0)
})

// Nettoyer l'event listener
onBeforeUnmount(() => {
  window.removeEventListener('resize', updateMobileView)
})
</script>

<style scoped>
.calendar-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.calendar-header-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.calendar-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.title-icon {
  width: 1rem;
  height: 1rem;
  color: var(--primary);
}

.legend-top {
  margin: 0;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 8px;
  border: 1.5px solid var(--border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.calendar-wrapper {
  flex: 1;
  background: #ffffff;
  border-radius: 12px;
  padding: 1.25rem;
  border: 1.5px solid var(--border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--border);
}

.nav-button {
  background: #ffffff;
  color: var(--text-primary);
  border: 1.5px solid var(--border);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.nav-button:hover {
  background: #000000;
  color: white;
  border-color: var(--primary);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgb(255 255 255 / 30%);
}

.nav-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(249, 115, 22, 0.2);
}

.nav-button svg {
  width: 18px;
  height: 18px;
}

.month-year {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.3px;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;
}

.day-header {
  text-align: center;
  font-weight: 600;
  color: var(--text-secondary);
  padding: 0.5rem 0.25rem;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.8;
}

.calendar-day {
  aspect-ratio: 1;
  background: var(--bg-secondary);
  border: 1.5px solid var(--border);
  border-radius: 8px;
  padding: 0.35rem;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  justify-content: space-between;
  min-height: 0;
  overflow: hidden;
}

.calendar-day::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.05) 100%);
  opacity: 0;
  transition: opacity 0.25s;
  pointer-events: none;
}

.calendar-day:hover {
  background: var(--bg-hover);
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.calendar-day:hover::before {
  opacity: 1;
}

.calendar-day.other-month {
  opacity: 0.35;
  background: var(--bg-primary);
}

.calendar-day.has-collection {
  border-color: var(--primary);
  border-width: 1.5px;
  /* background: linear-gradient(135deg, rgb(255 255 255 / 10%) 0%, rgba(251, 146, 60, 0.06) 100%); */
  box-shadow: 0 2px 6px rgb(104 144 168 / 41%);
}

/* Style pour la date du jour - Design moderne avec tons bleu/turquoise */
.calendar-day.today {
  border-color: #4a90e2 !important;
  border-width: 2px !important;
  background: linear-gradient(135deg, rgba(135, 201, 255, 0.25) 0%, rgba(72, 187, 221, 0.15) 100%) !important;
  font-weight: 700;
  box-shadow: 0 4px 16px rgba(74, 144, 226, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
  position: relative;
}

.calendar-day.today::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #4a90e2 0%, #48bbdd 100%);
  border-radius: 8px 8px 0 0;
}

/* Quand c'est à la fois today et has-collection - Style enrichi */
.calendar-day.today.has-collection {
  border-color: #2c5aa0 !important;
  border-width: 2px !important;
  background: linear-gradient(135deg, rgba(134, 173, 181, 0.28) 0%, rgba(102, 145, 157, 0.18) 100%) !important;
  box-shadow: 0 4px 18px rgba(44, 90, 160, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.35) !important;
}

.calendar-day.today.has-collection::after {
  background: linear-gradient(90deg, #2c5aa0 0%, #66919d 100%);
  height: 3px;
}

/* Style pour le numéro du jour du jour - Couleur harmonisée */
.calendar-day.today .day-number {
  color: #2c5aa0 !important;
  font-weight: 800 !important;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
  font-size: 0.8rem;
}

/* Hover pour la date du jour - Transition douce */
.calendar-day.today:hover {
  border-color: #357abd !important;
  background: linear-gradient(135deg, rgba(135, 201, 255, 0.35) 0%, rgba(72, 187, 221, 0.22) 100%) !important;
  box-shadow: 0 6px 20px rgba(74, 144, 226, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.4) !important;
  transform: translateY(-3px) scale(1.02);
}

.calendar-day.today.has-collection:hover {
  border-color: #1e4070 !important;
  background: linear-gradient(135deg, rgba(134, 173, 181, 0.38) 0%, rgba(102, 145, 157, 0.25) 100%) !important;
  box-shadow: 0 6px 22px rgba(44, 90, 160, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.4) !important;
  transform: translateY(-3px) scale(1.02);
}

.day-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.day-number {
  font-weight: 600;
  font-size: 0.8rem;
  color: var(--text-primary);
  line-height: 1.2;
  margin-bottom: auto;
  transition: all 0.2s;
  z-index: 1;
  position: relative;
}

.calendar-day:hover .day-number:not(.calendar-day.today .day-number) {
  color: var(--primary);
  font-weight: 700;
}

.day-collections {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  justify-content: center;
  align-items: center;
  margin-top: auto;
  padding-top: 0.2rem;
  z-index: 1;
  position: relative;
}

.collection-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2), 0 0 0 1.5px rgba(255, 255, 255, 0.9);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1.5px solid rgba(255, 255, 255, 0.95);
  cursor: pointer;
}

.collection-dot:hover {
  transform: scale(1.8);
  box-shadow: 0 4px 16px currentColor, 0 0 0 4px rgba(255, 255, 255, 0.95);
  z-index: 10;
}

.flux-deee {
  background: #000000;
  color: #000000;
}

.flux-dv {
  background: #1db954;
  color: #1db954;
}

.flux-enc {
  background: #FFB800;
  color: #FFB800;
}

.flux-om {
  background: #5352ed;
  color: #5352ed;
}

.flux-rs {
  background: #97001e;
  color: #97001e;
}

.flux-default {
  background: var(--text-secondary);
  color: var(--text-secondary);
}

.legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: var(--text-primary);
}

.legend-color {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.5);
}

@media (max-width: 768px) {
  .calendar-wrapper {
    padding: 0.75rem;
  }
  
  .calendar-header {
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
  }
  
  /* Sur mobile : 3 colonnes au lieu de 7 pour plus de lisibilité */
  .calendar-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }
  
  /* Masquer les en-têtes de jours sur mobile (trop d'encombrement) */
  .day-header {
    display: none;
  }
  
  .calendar-day {
    padding: 0.75rem 0.5rem;
    min-height: 100px;
    aspect-ratio: 0.85;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
  }
  
  .day-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    width: 100%;
  }
  
  .day-name {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.8;
  }
  
  .day-number {
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--text-primary);
  }
  
  /* Points de couleur beaucoup plus gros et visibles sur mobile */
  .collection-dot {
    width: 14px;
    height: 14px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(255, 255, 255, 0.95);
    border: 2px solid rgba(255, 255, 255, 0.95);
  }
  
  .day-collections {
    gap: 0.35rem;
    padding-top: 0.3rem;
  }
  
  /* Améliorer la légende sur mobile */
  .legend-top {
    padding: 0.85rem 0.85rem;
  }
  
  .legend-item {
    font-size: 0.8rem;
    gap: 0.5rem;
    line-height: 1.5;
    padding: 0.25rem 0;
  }
  
  .legend-color {
    width: 18px;
    height: 18px;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
    border: 1.5px solid rgba(255, 255, 255, 0.8);
  }
  
  .legend-items {
    gap: 0.4rem;
    flex-direction: column;
  }
  
  /* Style spécial pour le jour actuel sur mobile */
  .calendar-day.today {
    border-width: 3px !important;
    min-height: 105px;
  }
  
  .calendar-day.today .day-number {
    font-size: 1.4rem;
  }
  
  .calendar-day.today .day-name {
    font-weight: 700;
    color: var(--primary);
    opacity: 1;
  }
}
</style>

 
