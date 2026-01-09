# cacem

Application Vue.js 3 moderne pour consulter les dates de collecte des déchets dans les communes de la Martinique.

## 🚀 Fonctionnalités

- **Recherche intelligente** : Barre de recherche avec autocomplétion tolérante aux fautes d'orthographe
- **Carte interactive** : Visualisation de l'emplacement sélectionné sur une carte
- **Calendrier dynamique** : Affichage des dates de collecte avec codes couleur par type de déchet
- **Affichage par flux** : Vue détaillée des collectes organisées par type de déchet (DEEE, DV, ENC, OM, RS)
- **Design moderne** : Interface utilisateur élégante et responsive

## 📦 Installation

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Construire pour la production
npm run build
```

## 🔧 Réparation après déplacement

Si vous avez déplacé le projet (copier-coller), les dépendances peuvent être cassées. Pour réparer :

**Option 1 : Script automatique (PowerShell)**
```powershell
.\fix-dependencies.ps1
```

**Option 2 : Manuellement**
```bash
# Supprimer les anciennes dépendances
rm -rf node_modules package-lock.json

# Réinstaller les dépendances
npm install
```

## 🛠️ Technologies utilisées

- **Vue.js 3** : Framework JavaScript progressif
- **Vite** : Outil de build rapide
- **Leaflet** : Bibliothèque de cartes interactives
- **Fuse.js** : Recherche floue pour l'autocomplétion
- **Axios** : Client HTTP pour les requêtes API

## 📡 API

L'application utilise l'API CACEM :
- Endpoint V2 : `https://api.cacem.fr/api/v2/dechets/passages` (dates exactes)
- Endpoint V1 : `https://api.cacem.fr/api/v1/dechets/passages` (jours de la semaine)

## 🎨 Types de déchets

- **DEEE** : Équipements Électriques et Électroniques
- **DV** : Déchets Verts
- **ENC** : Encombrants
- **OM** : Ordures Ménagères
- **RS** : Recyclables Secs

## 📱 Responsive

L'application est entièrement responsive et s'adapte à tous les écrans (mobile, tablette, desktop).






