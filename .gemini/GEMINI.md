# Contexte du Projet : Extension Chrome "Auto-Mute Knight"

## 1. Vue d'ensemble
Ce projet est une extension Google Chrome (Manifest V3) destinée à la plateforme Stripchat.
**Objectif :** Automatiser la modération pour les utilisateurs privilégiés ("Chevaliers") en masquant/mutant automatiquement les utilisateurs indésirables selon des critères définis (spam, mots-clés, patterns de pseudos).

## 2. Stack Technique & Architecture
- **Core :** Javascript (Strict mode obligatoire).
- **Build System :** Vite (avec plugin CRXJS ou équivalent pour le HMR).
- **Format :** Manifest V3.
- **State Management :** Vuejs (pour le Popup/Options UI) - léger et performant.
- **Stockage :** `chrome.storage.local` pour la persistance des règles de filtrage.

## 3. Architecture des Composants
L'extension est divisée en trois parties distinctes qui ne doivent communiquer que via message passing :

### A. Content Script (Le Moteur)
- **Rôle :** Injecté dans `stripchat.com`. Il est responsable de la lecture du DOM et de l'action de "mute".
- **Contrainte Critique :** Utilisation de `MutationObserver` pour détecter les nouveaux messages.
- **Performance :** L'observer doit être débouncé ou throttlé si nécessaire pour ne pas impacter le framerate du stream vidéo (l'élément `<video>` est prioritaire).
- **Sélecteurs :** Les classes CSS de Stripchat sont souvent obfusquées ou dynamiques. Privilégier la sélection par attributs stables (`data-testid`, structure hiérarchique) ou permettre une configuration dynamique des sélecteurs.

### B. Background Service Worker
- **Rôle :** Gestionnaire d'état global, écouteurs d'événements Chrome.
- **Contrainte Manifest V3 :** Le Service Worker est éphémère. Ne jamais stocker d'état en variable globale ; tout doit passer par `chrome.storage`.

### C. Popup / Options Page
- **Rôle :** Interface pour les "Chevaliers" afin de configurer les regex de ban, les listes blanches/noires.
- **UX :** Doit être rapide et accessible sans fermer le chat.

## 4. Règles de Développement (Coding Guidelines)

### Performance & DOM
- Ne jamais utiliser de `setInterval` pour scanner le DOM. Toujours utiliser `MutationObserver`.
- Les manipulations du DOM doivent être minimales (ex: `display: none` via injection de style CSS dynamique plutôt que suppression de nœuds, pour éviter de casser le React/Vue sous-jacent du site).

### Sécurité & Distribution
- Pas de code distant (Remotely Hosted Code) interdit par le Web Store.
- Les données des utilisateurs filtrés restent locales.

### Gestion des Erreurs
- Le script doit être résilient. Si la structure HTML de Stripchat change, l'extension doit échouer silencieusement ou notifier l'utilisateur, mais ne jamais faire crasher la page.

## 5. Tâches Prioritaires pour l'Agent
1. Identifier les sélecteurs DOM actuels des messages et des noms d'utilisateurs sur Stripchat.
2. Implémenter le `MutationObserver` pour intercepter les nodes entrants.
3. Créer la logique de filtrage (Regex sur le contenu du message vs Liste d'utilisateurs).
4. Simuler les actions utilisateur (click sur le bouton mute) ou masquer visuellement les messages (shadow ban local).