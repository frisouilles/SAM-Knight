"use strict";

/**
 * Normalise le texte pour le rendre comparable (enlève accents, caractères spéciaux, etc.)
 */
export function normalizeText(text) {
  if (!text) return "";
  // Enlever les accents
  let res = text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  
  // Remplacements leetspeak (seulement si ce ne sont pas des caractères de ponctuation répététés)
  res = res.replace(/0/g, "o")
           .replace(/1/g, "i")
           .replace(/3/g, "e")
           .replace(/4/g, "a")
           .replace(/@/g, "a")
           .replace(/5/g, "s")
           .replace(/7/g, "t")
           .replace(/\$/g, "s");
           
  // On remplace les ! par des i seulement s'ils sont entourés de lettres (ex: h!elle)
  // Sinon on les laisse pour le nettoyage de ponctuation
  res = res.replace(/([a-z])!+([a-z])/g, "$1i$2");

  // Nettoyage final : on garde uniquement alpha-numérique et espaces
  return res.replace(/[^a-z0-9 ]/gi, " ").replace(/\s+/g, " ").trim();
}

/**
 * Calcul de la distance de Levenshtein entre deux chaînes
 */
export function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
      else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Vérifie si un texte contient un mot interdit ou un variant proche
 */
export function fuzzyCheck(message, ahoCorasick, bloomFilter, badWords, whitelist = []) {
  if (!message) return null;
  const normalizedMsg = normalizeText(message);
  
  // 1. Test via Aho-Corasick (Très rapide pour recherche multi-mots)
  if (ahoCorasick) {
    const results = ahoCorasick.search(normalizedMsg);
    if (results.length > 0) {
      // On filtre les résultats pour ne garder que les mots ENTIERS (pas de "pet" dans "petit")
      const validResults = results.filter(r => {
        const start = r.index;
        const end = start + r.word.length;
        
        // Vérification frontière gauche (début de phrase ou espace avant)
        const leftBoundary = (start === 0 || normalizedMsg[start - 1] === ' ');
        // Vérification frontière droite (fin de phrase ou espace après)
        const rightBoundary = (end === normalizedMsg.length || normalizedMsg[end] === ' ');
        
        return leftBoundary && rightBoundary && whitelist.indexOf(r.word) === -1;
      });

      if (validResults.length > 0) {
        // On prend le premier match valide
        return { type: "MOT_INTERDIT", found: validResults[0].word, trigger: validResults[0].word };
      }
    }
  }

  // 2. Test Fuzzy (Levenshtein) sur chaque mot
  const words = normalizedMsg.split(" ");
  for (let m = 0; m < words.length; m++) {
    const mw = words[m];
    if (mw.length < 3) continue;
    if (whitelist.indexOf(mw) !== -1) continue;
    
    for (let k = 0; k < badWords.length; k++) {
      const bw = normalizeText(badWords[k]);
      
      // Si correspondance exacte après normalisation (sécurité si Aho a raté un cas complexe)
      if (mw === bw) return { type: "FUZZY_EXACT", trigger: badWords[k], found: mw };

      // On ne fait du FUZZY (distance > 0) que sur des mots suffisamment longs
      // RÈGLE STRICTE : Pas de fuzzy sur les mots courts (< 6 lettres) pour éviter les faux positifs (ex: vivre vs vibre)
      if (bw.length < 6 || mw.length < 6) continue; 
      
      // Distance de Levenshtein
      if (Math.abs(mw.length - bw.length) <= 2) {
        const dist = levenshteinDistance(mw, bw);
        
        // Seuil d'erreur dynamique plus strict :
        // 6 à 8 lettres : 1 erreur max (ex: "connard" -> "connrd")
        // 9+ lettres    : 2 erreurs max (ex: "prostituée" -> "prostitue")
        const threshold = bw.length >= 9 ? 2 : 1;
        
        if (dist > 0 && dist <= threshold) return { type: "FUZZY", trigger: badWords[k], found: mw };
      }
    }
  }
  return null;
}

/**
 * Détecte le flood (messages répétitifs)
 */
export function checkFlood(username, text, userHistory) {
  if (!username || !text) return null;
  const now = Date.now();
  if (!userHistory[username]) userHistory[username] = [];
  userHistory[username].push({ text: text, time: now });
  if (userHistory[username].length > 5) userHistory[username].shift();
  const h = userHistory[username];
  if (h.length >= 3) {
    const last3 = h.slice(-3);
    if (last3[0].text === text && last3[1].text === text && now - last3[0].time < 30000) return "FLOOD (3x identique)";
  }
  return null;
}

/**
 * Détecte l'abus de majuscules
 */
export function checkCaps(text) {
  if (!text || text.length < 10) return null;
  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 6) return null;
  const caps = letters.replace(/[^A-Z]/g, "").length;
  const ratio = caps / letters.length;
  if (ratio > 0.8) return "CAPSLOCK (" + Math.round(ratio * 100) + "%)";
  return null;
}

/**
 * Évalue le résultat renvoyé par l'IA et décide si le message doit être banni ou signalé
 * Nouvelle logique Multi-classe (Clean, Neutral, Toxic) basée sur les seuils configurés.
 *
 * @param {Object|number} result - Résultat de l'IA (score ou objet {score, label})
 * @param {number} toxicThreshold - Seuil au-dessus duquel c'est TOXIC (ex: 0.70)
 * @param {number} cleanThreshold - Seuil en-dessous duquel c'est CLEAN (ex: 0.40)
 * @returns {Object|null} - Action à prendre ou null si clean
 */
export function evaluateAIResult(result, toxicThreshold = 0.70, cleanThreshold = 0.40) {
  if (!result) return null;
  
  // On récupère le score de toxicité (probabilité que ce soit toxique/négatif)
  // Si le worker renvoie un objet avec score, on l'utilise.
  const score = typeof result === 'object' ? result.score : result;
  
  // 1. Zone TOXIC (Rouge) : Score >= Seuil Toxique
  if (score >= toxicThreshold) {
    return { type: "AI_DETECTION", found: `toxic (${(score * 100).toFixed(0)}%)` };
  }
  
  // 2. Zone NEUTRAL (Orange) : Seuil Clean <= Score < Seuil Toxique
  if (score >= cleanThreshold) {
    return { type: "AI_NEUTRAL", found: `neutral (${(score * 100).toFixed(0)}%)` };
  }
  
  // 3. Zone CLEAN (Vert) : Score < Seuil Clean
  return null;
}
