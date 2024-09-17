<script setup>
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'v-calendar/style.css';
import '@fontsource/titillium-web/300.css'; 
import '@fontsource/titillium-web/700.css'; 
import '@fontsource/titillium-web/900.css'; 
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'; 
import axios from 'axios';


const selectedCommune = ref('');
const selectedQuartier = ref('');
const selectedVoie = ref('');
const communes = ref([]);
const quartiers = ref([]);
const voies = ref([]);
const apiData = ref([]); 
const filteredData = ref([]); 
const filteredData2 = ref([]); 
const filteredData3 = ref([]); 
const filteredData4 = ref([]); 
const filteredData5 = ref([]); 
const joursSemaine = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const cardA = ref(null);
const cardB = ref(null);
const cardC = ref(null);
const nextButtonA = ref(null);
const nextButtonB = ref(null);
const nextButtonC = ref(null);
const imagePath4 = "public/recycling.gif";
const imagePath3 = "public/cacemlogo.png";
const imagePath2 = "public/poubelle.gif";
const imagePath = "public/loca.png"; 
const currentIndex = ref(0);
const currentDate = ref('');
const weekNumber = ref('');
const isWeekEven = ref(false);
const joursCollectePaire = ref('');
const joursCollecteImpaire = ref('');
/* 
onMounted(async () => {
    const response = await axios.get('https://svrapi.agglo.local/api/v1/dechets/passages?$limit=15000');
    apiData.value = response.data.data;    
    const pageCount = Math.ceil(response.data.total /0); // Corrected from 50 to 1000
    communes.value = Array.from(new Set(apiData.value.map(item => item.COMMUNE.toUpperCase())));
  });  */

  onMounted(async () => {
    try {
        const response = await fetch('public/passages.json');
        if (response.ok) {
            const jsonData = await response.json();
            
            if (jsonData && Array.isArray(jsonData.data)) {
                apiData.value = jsonData.data;
                const pageCount = Math.ceil(jsonData.total / 1000);
                const dataWithCommune = jsonData.data.filter(item => item.COMMUNE);
                communes.value = Array.from(new Set(dataWithCommune.map(item => item.COMMUNE.toUpperCase())));
            } else {
                console.error('Fetched data is not in the expected format.');
            }
        } else {
            console.error('Error loading local JSON data:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('Error loading local JSON data:', error);
    }
});

const updateQuartiers = () => {
  quartiers.value = Array.from(new Set(apiData.value
    .filter(item => item.COMMUNE === selectedCommune.value)
    .map(item => item.QUARTIER)))
    .filter(quartier => quartier);
};
const updateVoies = () => {
  const filteredVoies = apiData.value
    .filter(item => item.COMMUNE === selectedCommune.value && item.QUARTIER === selectedQuartier.value)
    .map(item => item.VOIE);
  voies.value = Array.from(new Set(filteredVoies));
};
const isButtonClickable = computed(() => {
  return selectedCommune.value !== '' && selectedQuartier.value !== '' && selectedVoie.value !== '';
});
const filterData = () => {
  if (selectedCommune.value && selectedQuartier.value && selectedVoie.value) {

    filteredData.value = apiData.value.filter(item => {
      return (
        item.COMMUNE === selectedCommune.value &&
        item.QUARTIER === selectedQuartier.value &&
        item.VOIE === selectedVoie.value &&
        item.FLUX === "OM"
      );
    });
  } else {
    filteredData.value = [];
  }
};
const filterData2 = () => {
  if (selectedCommune.value && selectedQuartier.value && selectedVoie.value) {
    filteredData2.value = apiData.value.filter(item => {
      return (
        item.COMMUNE === selectedCommune.value &&
        item.QUARTIER === selectedQuartier.value &&
        item.VOIE === selectedVoie.value &&
        item.FLUX === "DEEE"
      );
    });
  } else {
    filteredData.value2 = [];
  }
};
const filterData3 = () => {
  if (selectedCommune.value && selectedQuartier.value && selectedVoie.value) {
    filteredData3.value = apiData.value.filter(item => {
      return (
        item.COMMUNE === selectedCommune.value &&
        item.QUARTIER === selectedQuartier.value &&
        item.VOIE === selectedVoie.value &&
        item.FLUX === "ENC"
      );
    });
  } else {
    filteredData.value3 = [];
  }
};
const filterData4 = () => {
  if (selectedCommune.value && selectedQuartier.value && selectedVoie.value) {
    filteredData4.value = apiData.value.filter(item => {
      return (
        item.COMMUNE === selectedCommune.value &&
        item.QUARTIER === selectedQuartier.value &&
        item.VOIE === selectedVoie.value &&
        item.FLUX === "DV"
      );
    });
  } else {
    filteredData.value4 = [];
  }
};
const filterData5 = () => {
  if (selectedCommune.value && selectedQuartier.value && selectedVoie.value) {
    filteredData5.value = apiData.value.filter(item => {
      return (
        item.COMMUNE === selectedCommune.value &&
        item.QUARTIER === selectedQuartier.value &&
        item.VOIE === selectedVoie.value &&
        item.FLUX === "RS"
      );
    });
  } else {
    filteredData.value5 = [];
  }
};

const getJoursSemaine = (joursArray) => {   
  
  const jours = joursArray.map((index) => joursSemaine[index]);
  return jours.join(', ');
};

const selectedDate = ref(null); 
const calendarAttributes = ref([]);
const getJoursSemainepair = (joursArray) => {
  const aujourdHui = new Date();
  const resultats = [];
  joursArray.forEach((jourSemaine) => {
    const prochaineDate = new Date(aujourdHui);
    const jourActuel = prochaineDate.getDay();
    const joursJusquauJourSemaine = (jourSemaine + 7 - jourActuel) % 7;
    prochaineDate.setDate(aujourdHui.getDate() + joursJusquauJourSemaine);
    const jour = prochaineDate.getDate();
    const mois = prochaineDate.getMonth();
    const annee = prochaineDate.getFullYear();
    const formattedDate = new Date(annee, mois, jour); 
    calendarAttributes.value.push({
      key: 'selected-date',
      highlight: {
        color: 'green', 
        fillMode: 'solid',
      },
      dates: formattedDate,
    });
    resultats.push(formattedDate.toLocaleDateString('fr-FR')); 
  });

  return resultats.join(', ');
};

function getnumsemaine(date) {
  var currentDate = new Date(date);
  var firstDay = new Date(currentDate.getFullYear(), 0, 1);
  var daysOffset = firstDay.getDay();
  var daysPassed = Math.floor((currentDate - firstDay) / 86400000) + 1;
  var weekNumber = Math.ceil((daysPassed + daysOffset) / 7);

  return weekNumber;
}


/* -------------------------------------------------------------------------------------------------------------------------------------------------------*/
let topo = 0; 
const filteredCalendarAttributes = computed(() => {
  const attributes = [];
  const aujourdHui = new Date();
  const numeroSemaine = getnumsemaine(aujourdHui);
  filteredData.value.forEach((item) => {
    let joursArray = item.semainePaire;
    let joursArray2 = item.semaineImpaire;

    joursArray.forEach((jourSemaine) => {
      const prochaineDate = new Date(aujourdHui);
      const jourActuel = prochaineDate.getDay();
      const joursJusquauJourSemaine = (jourSemaine + 7 - jourActuel) % 7;
      prochaineDate.setDate(aujourdHui.getDate() + joursJusquauJourSemaine);
      for (let i = 0; i < 12; i++) {
        const jour = prochaineDate.getDate();
        const mois = prochaineDate.getMonth();
        const annee = prochaineDate.getFullYear();
        const formattedDate = new Date(annee, mois, jour);

        let numeroSemaineverif = getnumsemaine(formattedDate);

if (numeroSemaineverif % 2 === 0) {
        attributes.push({
          key: 'selected-date',
          highlight: {
            color: '#cfe2ff',
            fillMode: 'solid',
          },
          dates: formattedDate,
        });
      }
        prochaineDate.setDate(prochaineDate.getDate() + 7);
      }
    });
 
    joursArray2.forEach((jourSemaine) => {
      const prochaineDate = new Date(aujourdHui);
      const jourActuel = prochaineDate.getDay();
      const joursJusquauJourSemaine = (jourSemaine + 7 - jourActuel) % 7;
      prochaineDate.setDate(aujourdHui.getDate() + joursJusquauJourSemaine);
      for (let i = 0; i < 12; i++) {
        const jour = prochaineDate.getDate();
        const mois = prochaineDate.getMonth();
        const annee = prochaineDate.getFullYear();
        const formattedDate = new Date(annee, mois, jour);

        let numeroSemaineverif = getnumsemaine(formattedDate);

if (numeroSemaineverif % 2 !== 0) {
        attributes.push({
          key: 'selected-date',
          highlight: {
            color: '#cfe2ff',
            fillMode: 'solid',
          },
          dates: formattedDate,
        });
      }
if (topo < 1) {
    console.log(formattedDate , topo );
    topo = topo + 1;
}      
        prochaineDate.setDate(prochaineDate.getDate() + 7);
      }
    });
      
  }); 
  return attributes;
});

const filteredData2CalendarAttributes = computed(() => {
const attributes = [];
const aujourdHui = new Date();
const numeroSemaine = getnumsemaine(aujourdHui);
filteredData2.value.forEach((item) => {
let joursArray = item.semainePaire;
let joursArray2 = item.semaineImpaire;
joursArray.forEach((jourSemaine) => {
const prochaineDate = new Date(aujourdHui);
const jourActuel = prochaineDate.getDay();
const joursJusquauJourSemaine = (jourSemaine + 7 - jourActuel) % 7;
prochaineDate.setDate(aujourdHui.getDate() + joursJusquauJourSemaine);

      for (let i = 0; i < 12; i++) {
        const jour = prochaineDate.getDate();
        const mois = prochaineDate.getMonth();
        const annee = prochaineDate.getFullYear();
        const formattedDate = new Date(annee, mois, jour);
        let numeroSemaineverif = getnumsemaine(formattedDate);

if (numeroSemaineverif % 2 === 0) {
        attributes.push({
          key: 'selected-date',
          highlight: {
            color: 'green',
            fillMode: 'solid',
          },
          dates: formattedDate,
        });
      }
        prochaineDate.setDate(prochaineDate.getDate() + 7);
      }
    });
 
    joursArray2.forEach((jourSemaine) => {
      const prochaineDate = new Date(aujourdHui);
      const jourActuel = prochaineDate.getDay();
      const joursJusquauJourSemaine = (jourSemaine + 7 - jourActuel) % 7;
      prochaineDate.setDate(aujourdHui.getDate() + joursJusquauJourSemaine);

      for (let i = 0; i < 12; i++) {
        const jour = prochaineDate.getDate();
        const mois = prochaineDate.getMonth();
        const annee = prochaineDate.getFullYear();
        const formattedDate = new Date(annee, mois, jour);

        let numeroSemaineverif = getnumsemaine(formattedDate);

if (numeroSemaineverif % 2 !== 0) {
        attributes.push({
          key: 'selected-date',
          highlight: {
            color: 'green',
            fillMode: 'solid',
          },
          dates: formattedDate,
        });
      }
        prochaineDate.setDate(prochaineDate.getDate() + 7);
      }
    });
      
  }); 
  return attributes;
});

const filteredData5CalendarAttributes = computed(() => {
  const attributes = [];
  const aujourdHui = new Date();
  const numeroSemaine = getnumsemaine(aujourdHui);
  filteredData5.value.forEach((item) => {
    let joursArray = item.semainePaire;
    let joursArray2 = item.semaineImpaire;

    joursArray.forEach((jourSemaine) => {
      const prochaineDate = new Date(aujourdHui);
      const jourActuel = prochaineDate.getDay();

      const joursJusquauJourSemaine = (jourSemaine + 7 - jourActuel) % 7;
      prochaineDate.setDate(aujourdHui.getDate() + joursJusquauJourSemaine);

      for (let i = 0; i < 12; i++) {
        const jour = prochaineDate.getDate();
        const mois = prochaineDate.getMonth();
        const annee = prochaineDate.getFullYear();
        const formattedDate = new Date(annee, mois, jour);

        let numeroSemaineverif = getnumsemaine(formattedDate);

if (numeroSemaineverif % 2 === 0) {
        attributes.push({
          key: 'selected-date',
          highlight: {
            color: 'yellow',
            fillMode: 'solid',
          },
          dates: formattedDate,
        });
      }
        prochaineDate.setDate(prochaineDate.getDate() + 7);
      }
    });
 
    joursArray2.forEach((jourSemaine) => {
      const prochaineDate = new Date(aujourdHui);
      const jourActuel = prochaineDate.getDay();

      const joursJusquauJourSemaine = (jourSemaine + 7 - jourActuel) % 7;
      prochaineDate.setDate(aujourdHui.getDate() + joursJusquauJourSemaine);

      for (let i = 0; i < 12; i++) {
        const jour = prochaineDate.getDate();
        const mois = prochaineDate.getMonth();
        const annee = prochaineDate.getFullYear();
        const formattedDate = new Date(annee, mois, jour);

        let numeroSemaineverif = getnumsemaine(formattedDate);

if (numeroSemaineverif % 2 !== 0) {
        attributes.push({
          key: 'selected-date',
          highlight: {
            color: 'yellow',
            fillMode: 'solid',
          },
          dates: formattedDate,
        });
      }
        prochaineDate.setDate(prochaineDate.getDate() + 7);
      }
    });
      
  }); 
  return attributes;
});

watch([selectedCommune, selectedQuartier, selectedVoie], () => {
  filterData();
});
watch([selectedCommune, selectedQuartier, selectedVoie], () => {
  filterData2();
});
watch([selectedCommune, selectedQuartier, selectedVoie], () => {
  filterData3();
});
watch([selectedCommune, selectedQuartier, selectedVoie], () => {
  filterData4();
});
watch([selectedCommune, selectedQuartier, selectedVoie], () => {
  filterData5();
});
onMounted(() => {
  cardA.value = document.getElementById("cardA");
  cardB.value = document.getElementById("cardB");
  cardC.value = document.getElementById("cardC");
  nextButtonA.value = document.getElementById("nextButtonA");
  nextButtonB.value = document.getElementById("nextButtonB");
  nextButtonC.value = document.getElementById("nextButtonC");
  nextButtonA.value.addEventListener("click", () => {
    cardA.value.style.display = "none";
    cardB.value.style.display = "block";
  });
  nextButtonB.value.addEventListener("click", () => {
    cardB.value.style.display = "none";
    cardC.value.style.display = "block";
  });
  nextButtonC.value.addEventListener("click", () => {
    cardC.value.style.display = "none";
    cardA.value.style.display = "block";
    selectedCommune.value = '';
  selectedQuartier.value = '';
  selectedVoie.value = '';
  
  });
onUnmounted(() => {
    clearInterval(intervalId);
  });
});
</script>

<template>
  <div class="container-fluid p-0">
    <div class="row no-gutters g-0 szg">
      <div  style="height: 100%;">
        <div class="flexbox-item text-white p-4 h-100 d-flex align-items-center justify-content-center dva" >
          <div class="box">
            <div class="wave -one"></div>
            <div class="wave -two"></div>
            <div class="wave -three"></div>
          </div>
        <div class="PR" style="margin-top: -80px;">
<div class="logoc">
<div id=LOGOcontainer>
    <img  :src="imagePath3" class="img-fluid img-thumbnail lcam MKO" alt="..." style="width: 28%;margin-bottom: 18px;margin-left: -27px;background-color: #77aaa5;">
  <div id=flip>
    <div><div>Recycler</div></div>
    <div><div>Trier</div></div>
    <div><div>Collecter</div></div>
  </div>
  <p style="color:#ffffff">Collecte des déchets</p>
</div>
</div>
                <div data-v-7a7a37b1="" style="width: 100%; height: 100%; margin: 0px; padding: 0px;">
                  
                <div class="cont">
                <div class="card" id="cardA">
                <div class="ccard">            
       <h4>Quel est le jour de collecte de vos poubelles et des Encombrants, déchets verts, DEEE (électroménagers) ?</h4>            
<p data-v-7a7a37b1="" style="text-align: center;">
  <div>
    <img :src="imagePath2" alt="Poubelle" style="width: 150px;">
  </div>
</p>
  <button id="nextButtonA" class="btn btn-success" style="font-size:15px;">Cliquez ici</button>
  </div>
   </div>  
  <div class="card text-center" id="cardB">
  <div class="ccard">
    <h4>Choisissez une commune, un quartier et une adresse pour voir le calendrier des collectes</h4>

<el-select v-model="selectedCommune" @change="updateQuartiers" placeholder="Sélectionnez une commune" style="margin-top: 20px;">
  <el-option v-for="commune in communes" :key="commune" :label="commune" :value="commune"></el-option>
</el-select>

<el-select v-model="selectedQuartier" @change="updateVoies" :disabled="!selectedCommune" placeholder="Sélectionnez un quartier">
  <el-option v-for="quartier in quartiers" :key="quartier" :label="quartier" :value="quartier"></el-option>
</el-select>

<el-select v-model="selectedVoie" :disabled="!selectedQuartier" placeholder="Sélectionnez une voie" >
  <el-option v-for="voie in voies" :key="voie" :label="voie" :value="voie"></el-option>
</el-select>
    <button id="nextButtonB" class="btn btn-success" :disabled="!isButtonClickable">Valider</button>
</div>
</div>
<div class="card" id="cardC">
<div class="ccard">
<div class="centerbuttom" style="margin-top: 40px;">
<button type="button" class="btn alert alert-primary" data-bs-toggle="modal" data-bs-target="#gris">
 Ordures ménagères,(bac gris)
</button>
<button type="button" class="btn alert alert-success" data-bs-toggle="modal" data-bs-target="#verts">
Encombrants, déchets verts, DEEE (électroménagers)
</button>
<button type="button" class="btn alert alert-warning" data-bs-toggle="modal" data-bs-target="#jaune">
Emballages (bac jaune)
</button>
  </div>
 <button id="nextButtonC" class="btn btn-success" style="margin-top:20px">Terminer</button>
           </div>
    </div>         
        </div>
        </div>
        </div>
        </div>
</div>
</div>
</div>

<div class="modal fade" id="gris" tabindex="-1" aria-labelledby="bacgris" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">        
        <h5 class="modal-title" id="exampleModalLabel">Ordures ménagères</h5>
      </div>
      <div class="modal-body">
        <div v-if="filteredData.some(item => item.semainePaire.length > 0 && item.semaineImpaire.length > 0)">
          <div v-for="item in filteredData" :key="item.id">
            <p class="H4A">Les prochains jours de collecte prévus dans votre quartier sont :</p>
            <div style="display: flex; justify-content: center; align-items: center;">
              <VCalendar title-position="right" ref="vdate" transparent borderless :attributes="filteredCalendarAttributes" />
            </div>
            <p class="jdc">En semaine paire et impaire: {{ getJoursSemaine(item.semainePaire) }}<br></p>
          </div>
        </div>
        <div v-else style="display: contents;">
          <h4 class="light-text">Aucune collecte de ces déchets n'est programmée 🗓 dans votre quartier.</h4>
          <img :src="imagePath4" class="img-fluid img-thumbnail" alt="...">
        </div>
      </div>
      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
    </div>
  </div>
</div>

<div class="modal fade" id="verts" tabindex="-1" aria-labelledby="bacverts" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="exampleModalLabel">DEEE, Encombrants, Déchets verts</h5>
      </div>
      <div class="modal-body">
        <div v-if="filteredData2.some(item => item.semainePaire.length > 0 || item.semaineImpaire.length > 0)">
          <div v-for="item in filteredData2" :key="item.id">
            <template v-once>
            </template>
            <p class="H4A">Les prochains jours de collecte prévus dans votre quartier sont :</p>
            <div style="display: flex; justify-content: center; align-items: center;">
              <VCalendar title-position="right" ref="vdate" transparent borderless :attributes="filteredData2CalendarAttributes" />
            </div>
            <p class="jdc">
              <span v-if="getJoursSemaine(item.semainePaire).length >= 2">Semaine paire: {{ getJoursSemaine(item.semainePaire) }}<br></span>
              <span v-if="getJoursSemaine(item.semaineImpaire).length >= 2">Semaine impaire: {{ getJoursSemaine(item.semaineImpaire) }}</span>
            </p>
          </div>
        </div>
        <div v-else style="display: contents;">
          <h4 class="light-text">Aucune collecte de ces déchets n'est programmée 🗓 dans votre quartier.</h4>
          <img :src="imagePath4" class="img-fluid img-thumbnail" alt="...">
        </div>
      </div>
      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
    </div>
  </div>
</div>

<div class="modal fade" id="jaune" tabindex="-1" aria-labelledby="bacjaune" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="exampleModalLabel" style="font-family: inherit; color: #073123;">Emballages</h5>
      </div>
      <div class="modal-body">
        <div v-if="filteredData5.some(item => item.semainePaire.length > 0 || item.semaineImpaire.length > 0)">
          <div v-for="item in filteredData5" :key="item.id">
            <p class="H4A">Les prochains jours de collecte prévus dans votre quartier sont :</p>
            <div style="display: flex; justify-content: center; align-items: center;">
            <VCalendar title-position="right" ref="vdate" transparent borderless :attributes="filteredData5CalendarAttributes" />
          </div>
          <p class="jdc">
              <span v-if="getJoursSemaine(item.semainePaire).length >= 2">Semaine paire: {{ getJoursSemaine(item.semainePaire) }}<br></span>
              <span v-if="getJoursSemaine(item.semaineImpaire).length >= 2">Semaine impaire: {{ getJoursSemaine(item.semaineImpaire) }}</span>
            </p>
        </div>
          <div style="display: flex; justify-content: center; align-items: center;">
          </div>
        </div>
        <div v-else style="display: contents;">
          <h4 class="light-text">Aucune collecte de ces déchets n'est programmée 🗓 dans votre quartier.</h4>
          <img :src="imagePath4" class="img-fluid img-thumbnail" alt="...">
        </div>
      </div>
      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
    </div>
  </div>
</div>


</template>
<style scoped>
@import url('https://afeld.github.io/emoji-css/emoji.css');
.btn{
  border: none!important;
}.el-select{
  margin-top: 20xp!important;
  margin-bottom: 20px!important;
}.modal-footer {
    border: none!important;
    height: auto;
}.modal-title {
    margin: auto;
    margin-top:0px;
    margin-bottom: 5px;
    line-height: 30px;
}.modal{
  max-height: 100vh;
}.modal-header .btn-close {
    display: none!important;
    padding: calc(var(--bs-modal-header-padding-y) * 0.5) calc(var(--bs-modal-header-padding-x) * 0.5);
    margin: calc(-0.5 * var(--bs-modal-header-padding-y)) calc(-0.5 * var(--bs-modal-header-padding-x)) calc(-0.5 * var(--bs-modal-header-padding-y)) auto;
}.modal-header {  
    border: none!important;;
}.modal-body {
    position: relative;
    flex: 1 1 auto;
    padding: var(--bs-modal-padding);
    display: grid;
    place-items: center;
    height: auto;
    margin-top: 20px;
}.alert-warning {
    width: 100%;
}.szg{
height: 100vh;
} h1{
    font-family: 'Titillium Web', sans-serif;
    font-weight: 700;
    font-size: 3rem;
    color: darken($aqua, 3%);
    margin :0 px;}.ccard{
   font-family: 'Titillium Web', sans-serif;
  display: flex; flex-direction: column; justify-content: center; align-items: center;width: 100%;
    height: 100%;
}.card {
    width :380px;
  height:400px;
  box-shadow: 20px 20px 50px rgba(0, 0, 0, 0.2);
  border-radius: 15px;
   border-top: 1px solid rgba(255, 255, 255, 0.4);
   border-left: 1px solid rgba(255, 255, 255, 0.4);
   backdrop-filter:blur(100px);
    display: none;
    text-align: center;
    margin: 20px;
    padding: 20px;
      margin: auto;  
      -webkit-box-shadow: 0px 0px 33px -8px rgb(255 255 255 / 45%);
    -moz-box-shadow: 0px 0px 33px -8px rgba(255,255,255,0.6);
    box-shadow: 0px 0px 33px -8px rgb(255 255 255 / 42%);
}#cardA {
    display: block;
}h4, .h4 {
    font-size: 1.2rem;
    COLOR: #0a5c15;
    text-align: center;
    animation: colordAnimation 5s infinite alternate;
    margin-top:15px;
    margin-bottom: 15px;
    font-weight:300;
}.btn-success {
  --bs-btn-bg: #0a5b15;
  animation: backgroundAnimation 15s infinite alternate;
  border:none!important;
}.form-select {
    margin-top: 15px;
    margin-bottom: 15px;
  border: var(--bs-border-width) solid #0a5b15;
}.box {
	position: fixed;
    transform: rotate(53deg);
    top: -15%;
    opacity: 46%;	
}.wave.-three {
  animation: drift 85500ms infinite linear; 
  position: fixed;
  background-color: #f1f1f1;
}.wave.-two {
  animation: drift 31000ms infinite linear; 
  opacity: .1;
  background: rgb(52, 52, 52);
  position: fixed;
}.wave {
  position: fixed;
  top: 0;
  left: 0;
  opacity: .4;
  position: absolute;
  top: 3%;
  background: #0000;
  width: 1500px;
  height: 1300px;
  margin-left: -150px;
  margin-top: -250px;
  transform-origin: 50% 48%;
  border-radius: 43%;
  animation: drift 21000ms infinite linear; 
}@keyframes drift {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}.box:after {
  content: '';
  display: block;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  z-index: 11;
  transform: translate3d(0, 0, 0);
}.contain {
	animation-delay: 4s;
	z-index: 1000;
	position: fixed;
	top: 0;
	left: 0;
	bottom: 0;
	right: 0;
  display: -webkit-box;
  display: -ms-flexbox;
  display: flex;
  -ms-flex-flow: row nowrap;
  flex-flow: row nowrap;
  -webkit-box-pack: center;
  -ms-flex-pack: center;
  justify-content: center;
  -webkit-box-align: center;
  -ms-flex-align: center;
  align-items: center;
 background: #25a7d7;
  background: -webkit-linear-gradient(#25a7d7, #2962FF);
  background: linear-gradient(#25a7d7, #25a7d7);
}.icon {
  width: 100px;
  height: 100px;
  margin: 0 5px;
}.icon:nth-child(2) img {-webkit-animation-delay: 0.2s;animation-delay: 0.2s}
.icon:nth-child(3) img {-webkit-animation-delay: 0.3s;animation-delay: 0.3s}
.icon:nth-child(4) img {-webkit-animation-delay: 0.4s;animation-delay: 0.4s}
.icon img {
  -webkit-animation: anim 2s ease infinite;
  animation: anim 2s ease infinite;
  -webkit-transform: scale(0,0) rotateZ(180deg);
  transform: scale(0,0) rotateZ(180deg);
}.container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}.btn-success {
    --bs-btn-color: #fff;
    --bs-btn-bg: #064233;
    --bs-btn-border-color: #00000000;
    --bs-btn-hover-color: #fff;
    --bs-btn-hover-bg: #277b5a;
    --bs-btn-hover-border-color: #499874;
    --bs-btn-focus-shadow-rgb: 60, 153, 110;
    --bs-btn-active-color: #fff;
    --bs-btn-active-bg: #146c43;
    --bs-btn-active-border-color: #13653f;
    --bs-btn-active-shadow: inset 0 3px 5px rgba(0, 0, 0, 0.125);
    --bs-btn-disabled-color: #fff;
    --bs-btn-disabled-bg: #198754;
    --bs-btn-disabled-border-color: #198754;       
}h4, .h4 {
    font-size: 1.3rem;
    COLOR: #064233;
    text-align: center;
}.H4A{
  font-size: 0.95rem;
    COLOR: #064233;
    text-align: center;
    margin-top: -30px;
    margin-bottom: 5px;
}.alert-primary {
    width: 100%;
}.bg-secondary {
    --bs-bg-opacity: 1;
    background-color: white!important;
}.img-thumbnail {
    padding: 0rem;
    background-color: #ffffff;
    border: none;
    border-radius: 0px;
    max-width: 70%;
    height: auto;
}.logoc{
  display: flex; 
  justify-content: center; 
  align-items: center; 
 margin-top:0px
}.dva{
  background-color: #0a5c48;
  animation: backgroundAnimation 5s infinite alternate;
}.cont{
  display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
}#LOGOcontainer {
  color:#999;
  text-transform: uppercase;
  font-size:30px;
  font-weight:bold;
  text-align: center;
  width:100%;
  bottom:45%;
  display:block;
   margin:0px;
     animation: colordAnimation 5s infinite alternate;
}#flip {
  height:50px;
  overflow:hidden;
}#flip > div > div {
  color:#fff;
  padding:0px 12px;
  height:45px;
  margin-bottom:45px;
  display:inline-block;
}#flip div:first-child {
  animation: show 5s linear infinite;
}#flip div div {
  background:#df610e;
  border-radius: 7px;
}#flip div:first-child div {
  background:#0175b8;
  border-radius: 7px;
}#flip div:last-child div {
  background:#f5da0b;
  border-radius: 7px;
}#flip div:last-child div {
  background:#6eae2b;
  border-radius: 7px;
}.lcam{
  animation: wiggle 1.5s linear infinite;
}
@keyframes show {
  0% {margin-top:-270px;}
  5% {margin-top:-180px;}
  33% {margin-top:-180px;}
  38% {margin-top:-90px;}
  66% {margin-top:-90px;}
  71% {margin-top:0px;}
  99.99% {margin-top:0px;}
  100% {margin-top:-270px;}
}
@keyframes wiggle {
  0%, 7% {
    transform: rotateZ(0);
  }
  15% {
    transform: rotateZ(-15deg);
  }
  20% {
    transform: rotateZ(10deg);
  }
  25% {
    transform: rotateZ(-10deg);
  }
  30% {
    transform: rotateZ(6deg);
  }
  35% {
    transform: rotateZ(-4deg);
  }
  40%, 100% {
    transform: rotateZ(0);
  }
}
@keyframes backgroundAnimation {
  0% {
    background-color: #5f9e99;
  }
  50% {
    background-color: #5f9e99; 
  }
  100% {
    background-color: #5f9d98;
  }
}
@keyframes colordAnimation {
  0% {
    color: #4f827d;
  }
  50% {
    color: #426b67; 
  }
  100% {
   color: #4f827d;
  }
}
@-webkit-keyframes anim{
  0% {
    -webkit-transform: scale(0,0) rotateZ(-90deg);
    transform: scale(0,0) rotateZ(-90deg);opacity:0
  }
  30% {
    -webkit-transform: scale(1,1) rotateZ(0deg);
    transform: scale(1,1) rotateZ(0deg);opacity:1
  }
  50% {
    -webkit-transform: scale(1,1) rotateZ(0deg);
    transform: scale(1,1) rotateZ(0deg);opacity:1
  }
  80% {
    -webkit-transform: scale(0,0) rotateZ(90deg);
    transform: scale(0,0) rotateZ(90deg);opacity:0
}}
@keyframes anim{
  0% {
    -webkit-transform: scale(0,0) rotateZ(-90deg);
    transform: scale(0,0) rotateZ(-90deg);opacity:0
  }
  30% {
    -webkit-transform: scale(1,1) rotateZ(0deg);transform: scale(1,1) rotateZ(0deg);opacity:1
  }
  50% {
    -webkit-transform: scale(1,1) rotateZ(0deg);
    transform: scale(1,1) rotateZ(0deg);opacity:1
  }
  80% {
    -webkit-transform: scale(0,0) rotateZ(90deg);
    transform: scale(0,0) rotateZ(90deg);opacity:0
  }}

@media only screen and (max-width: 600px) {
  .MKO{
  width: 80%!important;
  margin-top: 50px;}}
.modal-title {
  font-weight: 300;
    color: #58807d;
    font-size: 31px;
    margin-top: 17px;
}.el-select-dropdown {
  max-width: 100%;
  width: auto !important;
}.el-select {
  width: 100%;
}.el-select-dropdown {
    position: absolute;
    left: 0!important;
    right: 0!important;
    top: 100%;
    z-index: 1000;
    width: 100%;
    box-sizing: border-box;
    transition: all 0.3s ease;
}.jdc{
  margin-top: 0px;
    margin-bottom: 0px;
    text-align: center;
    background-color: #58807d;
    color: initial;
    border-radius: 7px;
    padding: 9px;
    width: 300px;
    margin: auto;
}.btn-close {
    --bs-btn-close-color: #58807d;
    --bs-btn-close-bg: url(data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23000'%3e%3cpath d='M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414z'/%3e%3c/svg%3e);
    --bs-btn-close-opacity: 0.5;
    --bs-btn-close-hover-opacity: 0.75;
    --bs-btn-close-focus-shadow: 0 0 0 0.25rem rgba(0, 0, 0, 0);
    --bs-btn-close-focus-opacity: 1;
    --bs-btn-close-disabled-opacity: 0.25;
    --bs-btn-close-white-filter: invert(1) grayscale(100%) brightness(200%);
    box-sizing: content-box;
    min-width: 58.5em;
    height: 2.5em;
    padding: 0.25em 0.25em;
    color: #58807d;
    background: transparent var(--bs-btn-close-bg) center / 1em auto no-repeat;
    border: 0;
    border-radius: 0.375rem;
    opacity: var(--bs-btn-close-opacity);
    margin-bottom: -52px;
}.modal-footer{
  margin: auto;
  margin-top: -20px;
}.btn-secondary {
    --bs-btn-color: #fff;
    --bs-btn-bg: #58807d;
    --bs-btn-border-color: #6c757d;
    --bs-btn-hover-color: #fff;
    --bs-btn-hover-bg: #5c636a;
    --bs-btn-hover-border-color: #565e64;
    --bs-btn-focus-shadow-rgb: 130, 138, 145;
    --bs-btn-active-color: #fff;
    --bs-btn-active-bg: #565e64;
    --bs-btn-active-border-color: #51585e;
    --bs-btn-active-shadow: inset 0 3px 5px rgba(0, 0, 0, 0.125);
    --bs-btn-disabled-color: #fff;
    --bs-btn-disabled-bg: #6c757d;
    --bs-btn-disabled-border-color: #6c757d;
}
</style>


