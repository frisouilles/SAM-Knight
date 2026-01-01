"use strict";

import {
  normalizeText, levenshteinDistance, fuzzyCheck, checkFlood, checkCaps, evaluateAIResult
} from './logic.js';
import { AhoCorasick, BloomFilter } from './algorithms.js';
import { DEFAULT_NEUTRAL_THRESHOLD, DEFAULT_NEUTRAL_ACTION } from './config.js';

// ==========================================
//              CONFIGURATION
// ==========================================
const VERSION = "1.0.28";
const PREFIX = "[AM-Knight]";
const CONFIRM_KEYWORDS = ["Mute", "Exclure", "Confirm", "Yes", "Désactiver", "Désactive", "Désactivez"];
let ACTIVE_LEAGUES = ["color-league-grey"];
const LEAGUES = [
  { id: "color-league-grey", label: "Gry", color: "#aaaaaa" },
  { id: "color-league-bronze", short: "Brz", label: "Bronze", color: "#cd7f32" },
  { id: "color-league-silver", short: "Sil", label: "Argent", color: "#c9e7fe" },
  { id: "color-league-gold", short: "Gld", label: "Or", color: "#ffd700" },
  { id: "color-league-diamond", short: "Dia", label: "Diamant", color: "#d424ff" },
  { id: "color-league-royal", short: "Ryl", label: "Royal", color: "#e54500" },
];

const DEFAULT_LEAGUE_TOLERANCE = {
  "color-league-grey": 0.70,
  "color-league-bronze": 0.80,
  "color-league-silver": 0.85,
  "color-league-gold": 0.90,
  "color-league-diamond": 0.95,
  "color-league-royal": 0.98,
  "default": 0.80
};
let leagueToleranceSettings = Object.assign({}, DEFAULT_LEAGUE_TOLERANCE);

const DEFAULT_WHITELIST = ["petite", "strip", "mieux", "belle", "belles", "mille", "meilleur", "meilleure", "bonne", "donne", "sonne", "tonne", "canne", "panne", "vanne", "passe", "basse", "casse", "fasse", "lisse", "masse", "tasse", "lasse", "classe", "pure", "pate", "pote", "rate", "date", "gate", "hote", "note", "vote", "cote", "cure", "mure", "dure", "bure", "sure", "elle", "meme", "pere", "mere", "frere", "assis", "assez", "aussi", "ainsi", "pass", "bass", "mass", "grass", "glass", "class", "duck", "clock", "sock", "rock", "lock", "block", "dock", "beach", "peach", "teach", "reach", "sheet", "shirt", "shot", "shut", "hello", "help", "hell", "voiture", "rencontre", "vivre"];
const BAD_EMOJIS = ["\uD83D\uDD95", "\uD83E\uDD2E", "\uD83E\uDD22", "\uD83D\uDCA9", "\uD83D\uDC80", "\u2620", "\uD83E\uDE78", "\uD83D\uDC89", "\uD83E\uDD21", "\uD83E\uDD2C"];
const DEFAULT_BAD_WORDS = BAD_EMOJIS.concat([
  "pute", "salope", "chienne", "conne", "grognasse", "pétasse", "truie", "moche", "thon", "grosse", "bite", "beurette", "viol", "violer", "avorte", "femelle", "nègre", "négro", "bougnoule", "pd", "pédale", "tapette", "enculé", "pedo", "pedophile", "enfant", "gamine", "mineur", "scato", "pisse", "caca", "zoo", "tuer", "meurtre", "baise", "connard", "fdp", "tg", "creve", "bitch", "slut", "whore", "cunt", "fuck", "asshole", "dick", "cock", "suck", "blowjob", "rape"
]);
const MUTE_BUTTON_SELECTOR = ".mute-button.mute-button-iconified";

let USER_HISTORY = {};
let MODEL_MUTED_USERS = {}; 
let LAST_URL = location.href;
let BAD_WORDS = [];
let WHITELIST = [];
let AHO_CORASICK = null;
let BLOOM_FILTER = null;
let isScanEnabled = false;
let isAutoMuteActive = false;
let cleanThreshold = 0.40;
let toxicThreshold = 0.70;
let neutralAction = DEFAULT_NEUTRAL_ACTION;

function buildAlgorithms() {
  try {
    const normalizedBadWords = BAD_WORDS.map(w => normalizeText(w)).filter(w => w.length > 0);
    AHO_CORASICK = new AhoCorasick(normalizedBadWords);
    BLOOM_FILTER = new BloomFilter(Math.max(1000, normalizedBadWords.length * 10));
    normalizedBadWords.forEach(w => BLOOM_FILTER.add(w));
  } catch (e) { console.error("Algorithm Error", e); }
}

function updateConfiguration(callback) {
  if (!chrome.runtime?.id) return;
  try {
    chrome.storage.local.get({ 
      customBlacklist: [], 
      customWhitelist: [], 
      isEnabled: false, 
      isAutoMuteActive: false, 
      activeLeagues: ["color-league-grey"],
      cleanThreshold: 0.40,
      toxicThreshold: 0.70,
      neutralAction: DEFAULT_NEUTRAL_ACTION,
      leagueTolerances: {}
    }, function(items) {
      if (chrome.runtime.lastError) return;
      BAD_WORDS = DEFAULT_BAD_WORDS.concat(items.customBlacklist);
      WHITELIST = DEFAULT_WHITELIST.concat(items.customWhitelist);
      isScanEnabled = items.isEnabled;
      isAutoMuteActive = items.isAutoMuteActive;
      ACTIVE_LEAGUES = items.activeLeagues;
      cleanThreshold = items.cleanThreshold;
      toxicThreshold = items.toxicThreshold;
      neutralAction = items.neutralAction;
      if (items.leagueTolerances) {
        leagueToleranceSettings = { ...DEFAULT_LEAGUE_TOLERANCE, ...items.leagueTolerances };
      }
      buildAlgorithms();
      if (callback) callback();
    });
  } catch(e) { console.warn("Storage error", e); }
}

function logToUI(msg, type, userInfo) {
  console.log("[AM-Knight] [Content] logToUI:", msg, type); // Debug
  try {
    chrome.runtime.sendMessage({ type: 'LOG_TO_DEVTOOLS', msg, logType: type, userInfo });
  } catch (e) {
    console.error("[AM-Knight] [Content] logToUI error:", e);
  }
}

function extractMessageText(msgNode) {
  if (!msgNode) return "";
  const clone = msgNode.cloneNode(true);
  clone.querySelector(".message-username")?.remove();
  clone.querySelectorAll("button").forEach(b => b.remove());
  return clone.textContent.trim();
}

function getModelName() {
  const path = location.pathname.split("/");
  return path[1] || "unknown";
}

function handleMatch(msg, username, text, matchedLeague, match, isTargeted, aiInfo = "") {
  const reason = typeof match === "string" ? match : match.type + " (" + match.found + ")";
  const userInfo = { name: username, color: matchedLeague.color, fullMessage: text, found: match.found || null, aiInfo };
  const model = getModelName();
  if (!MODEL_MUTED_USERS[model]) MODEL_MUTED_USERS[model] = new Set();
  const mutedSet = MODEL_MUTED_USERS[model];

  const isAutoMuteSet = isAutoMuteActive && isTargeted;
  
  if (!isAutoMuteSet && match) {
    console.log(`[AM-Knight] 🔍 DIAGNOSTIC REFUS MUTE: GlobalMute=${isAutoMuteActive}, UserCiblé=${isTargeted}, LigueUser=${matchedLeague.id}, LiguesActives=${JSON.stringify(ACTIVE_LEAGUES)}`);
  }

  logToUI(`${isAutoMuteSet ? "MUTE" : "SCAN"} | ${reason} ${aiInfo}`, isAutoMuteSet ? "action" : "warn", userInfo);

  if (isAutoMuteSet && !mutedSet.has(username)) {
    const btn = msg.querySelector(MUTE_BUTTON_SELECTOR);
    if (btn && !btn.classList.contains("muted")) {
      mutedSet.add(username);
      
      // Humanization: Simulation d'une pression réelle (MouseDown -> Délai -> MouseUp/Click)
      const opts = { bubbles: true, cancelable: true, view: window };
      btn.dispatchEvent(new MouseEvent('mousedown', opts));
      
      const pressDuration = 50 + Math.floor(Math.random() * 100); // Entre 50ms et 150ms
      
      setTimeout(() => {
        btn.dispatchEvent(new MouseEvent('mouseup', opts));
        btn.click();
        console.log(`[AM-Knight] 👆 MUTE (Humanized ${pressDuration}ms) sur: ${username}`);
        setTimeout(() => checkButtons(document.body), 100);
      }, pressDuration);

    } else if (!btn) {
      console.warn("[AM-Knight] Bouton MUTE non trouvé pour", username, "avec le sélecteur", MUTE_BUTTON_SELECTOR);
    }
  }
}

function handleNeutral(msg, username, text, matchedLeague, match, aiInfo = "") {
  const reason = match.found || "Neutral";
  const userInfo = { name: username, color: matchedLeague.color, fullMessage: text, found: match.found, aiInfo };
  
  // Log discret
  logToUI(`NEUTRAL | ${reason} ${aiInfo}`, "warn", userInfo);

  // Action Visuelle
  if (neutralAction === 'highlight') {
    msg.style.borderLeft = "4px solid #FFA500"; // Orange
    msg.style.backgroundColor = "rgba(255, 165, 0, 0.1)";
  } else if (neutralAction === 'hide') {
    msg.style.opacity = "0.3";
    msg.style.fontSize = "0.8em";
  }
}

function checkButtons(node) {
  if (!node || node.nodeType !== 1) return;
  const found = node.querySelectorAll('button, .button, [role="button"], .btn, .sc-button');
  for (let i = 0; i < found.length; i++) {
    const btn = found[i];
    const text = btn.textContent.trim();
    if (CONFIRM_KEYWORDS.some(k => text.includes(k))) {
      const isAlreadyMuted = btn.classList.contains("muted") || btn.dataset.muted === "true";
      const isPureConfirm = text.includes("Désactiver") || text.includes("Confirm") || text.includes("Yes") || text.includes("Exclure");
      if (isPureConfirm || !isAlreadyMuted) {
        setTimeout(() => btn.click(), 50);
      }
    }
  }
}

function processMessages(node) {
  if (!chrome.runtime?.id || !isScanEnabled) return;
  if (!node || node.nodeType !== 1) return;
  const messages = node.classList.contains("message-body") ? [node] : node.querySelectorAll(".message-body");
  
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.dataset.amScanned) continue;
    msg.dataset.amScanned = "true";
    
    const skipSelector = ".m-bg-public-tip, .m-bg-model, .lovense-toy-message, .lovense-tip-message, .goal-message, .user-muted-message, .group-show-user-joined-message, .invisible-mode-message, .m-line-menu-announce, .m-bg-fan-club-tip-discount, .m-bg-system";
    if (msg.matches(skipSelector) || msg.closest(skipSelector)) continue;

    // Skip Knights (Moderators/Special users with shield icon)
    if (msg.querySelector(".username-role-icon.knight")) continue;

    let matchedLeague = null;
    let isTargeted = false;
    let finalTolerance = leagueToleranceSettings["default"];

    // 1. Détection Prioritaire : "Ex" (Anciens gradés)
    // Structure: <span class="color-league-bronze"><sup>ex</sup></span>
    const exSup = Array.from(msg.querySelectorAll("sup")).find(el => el.textContent.trim().toLowerCase() === "ex");
    if (exSup) {
      const parent = exSup.parentElement;
      for (const league of LEAGUES) {
        if (parent && parent.classList.contains(league.id)) {
          matchedLeague = league;
          finalTolerance = leagueToleranceSettings[league.id];
          if (ACTIVE_LEAGUES.includes(league.id)) isTargeted = true;
          break;
        }
      }
    }

    // 2. Détection Standard (si pas "Ex")
    if (!matchedLeague) {
      for (const league of LEAGUES) {
        const leagueEl = msg.querySelector("." + league.id);
        if (leagueEl) {
          matchedLeague = league;
          finalTolerance = leagueToleranceSettings[league.id];
          if (leagueEl.querySelector(".username-role-icon.king")) finalTolerance = 0.99;
          if (ACTIVE_LEAGUES.includes(league.id)) isTargeted = true;
          break;
        }
      }
    }
    
    if (!matchedLeague) matchedLeague = { label: "Guest", color: "#888" };
    const username = (msg.querySelector(".message-username")?.textContent || "Unknown").trim();
    const text = extractMessageText(msg);
    
    const match = fuzzyCheck(text, AHO_CORASICK, BLOOM_FILTER, BAD_WORDS, WHITELIST) 
               || checkFlood(username, text, USER_HISTORY) 
               || checkCaps(text);

    chrome.runtime.sendMessage({ type: 'AI_REQUEST', text }, (result) => {
      if (chrome.runtime.lastError) {
        console.warn("[AM-Knight] Communication perdue (Context Invalidated?). Veuillez rafraîchir la page.", chrome.runtime.lastError);
        return;
      }
      const score = result ? (typeof result === 'object' ? result.score : result) : 0;
      const diagRaw = (result && typeof result === 'object' && result.diag) ? result.diag : '';
      const limitPct = (finalTolerance * 100).toFixed(0);
      
      // Determine Treatment
      let treatment = "CLEAN";
      let aiMatch = null;
      
      if (match) {
         treatment = match.type; 
      } else {
         aiMatch = evaluateAIResult(result, toxicThreshold, cleanThreshold);
         if (aiMatch) {
             if (aiMatch.type === "AI_DETECTION") treatment = "TOXIQUE";
             else if (aiMatch.type === "AI_NEUTRAL") treatment = "NEUTRE";
         }
      }

      // New Format: <league>(<threshold>) | <treatment> | <diag>
      const aiInfo = `| ${matchedLeague.label}(${limitPct}%) | ${treatment} | ${diagRaw}`;

      if (match) {
        handleMatch(msg, username, text, matchedLeague, match, isTargeted, aiInfo);
      } else {
        if (aiMatch && aiMatch.type === "AI_NEUTRAL") {
          handleNeutral(msg, username, text, matchedLeague, aiMatch, aiInfo);
        } else if (aiMatch) {
          handleMatch(msg, username, text, matchedLeague, aiMatch, isTargeted, aiInfo);
        } else {
          const status = text.split(/\s+/).length < 3 ? "SHORT" : "OK";
          logToUI(`SCAN | ${status} ${aiInfo}`, "safe", { name: username, color: matchedLeague.color, fullMessage: text, aiInfo });
        }
      }
    });
  }
}

function throttle(func, limit) {
  let inThrottle;
  return function() {
    if (!inThrottle) {
      func.apply(this, arguments);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
}

const throttledProcess = throttle((node) => {
  processMessages(node);
  checkButtons(node);
}, 200);

const globalObserver = new MutationObserver((mutations) => {
  mutations.forEach((m) => {
    m.addedNodes.forEach((node) => {
      if (node.nodeType === 1) throttledProcess(node);
    });
  });
});

function start() {
  if (!document.body) return;
  try { globalObserver.disconnect(); } catch (e) {}
  globalObserver.observe(document.body, { childList: true, subtree: true });
  processMessages(document.body);
  checkButtons(document.body);
}

updateConfiguration(() => start());

// Écoute les changements de réglages en temps réel
if (chrome.runtime?.id) {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      if (changes.isEnabled) isScanEnabled = changes.isEnabled.newValue;
      if (changes.isAutoMuteActive) isAutoMuteActive = changes.isAutoMuteActive.newValue;
      if (changes.activeLeagues) ACTIVE_LEAGUES = changes.activeLeagues.newValue;
      if (changes.cleanThreshold) cleanThreshold = changes.cleanThreshold.newValue;
      if (changes.toxicThreshold) toxicThreshold = changes.toxicThreshold.newValue;
      if (changes.neutralAction) neutralAction = changes.neutralAction.newValue;
      if (changes.leagueTolerances) {
         leagueToleranceSettings = { ...DEFAULT_LEAGUE_TOLERANCE, ...changes.leagueTolerances.newValue };
      }
      if (changes.customBlacklist || changes.customWhitelist) {
        updateConfiguration(); // Recharge les listes et reconstruit les algos
      }
      console.log("[AM-Knight] Réglages mis à jour en direct.");
    }
  });
}

setInterval(() => {
  if (location.pathname !== LAST_URL) {
    LAST_URL = location.pathname;
    USER_HISTORY = {};
    updateConfiguration(start); 
  }
}, 3000);
