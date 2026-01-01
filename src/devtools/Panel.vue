<template>
  <div class="devtools-panel">
    <header class="panel-header">
      <div class="header-left">
        <img src="/icon.png" class="logo" />
        <span class="title">AM-KNIGHT</span>
      </div>
      
      <div class="header-controls">
        <button 
          class="btn-toggle" 
          :class="{ active: settings.isEnabled }" 
          @click="toggleSetting('isEnabled')"
          title="Activer/Désactiver le scan global"
        >
          SCAN: {{ settings.isEnabled ? 'ON' : 'OFF' }}
        </button>
        
        <button 
          class="btn-toggle" 
          :class="{ active: settings.isAutoMuteActive, danger: settings.isAutoMuteActive }" 
          @click="toggleSetting('isAutoMuteActive')"
          title="Activer/Désactiver le MUTE automatique"
        >
          MUTE: {{ settings.isAutoMuteActive ? 'ON' : 'OFF' }}
        </button>
      </div>

      <div class="header-right">
        <button @click="clearLogs" class="btn-clear" title="Effacer la console">CLR</button>
        <span class="count">{{ logs.length }}</span>
      </div>
    </header>

    <div class="leagues-bar">
      <span class="label">Ligues:</span>
      <button 
        v-for="league in leagues" 
        :key="league.id"
        class="league-chip"
        :class="{ active: settings.activeLeagues.includes(league.id) }"
        :style="{ borderColor: league.color, color: settings.activeLeagues.includes(league.id) ? '#fff' : league.color, backgroundColor: settings.activeLeagues.includes(league.id) ? league.color : 'transparent' }"
        @click="toggleLeague(league.id)"
        :title="'Cibler les ' + league.label"
      >
        {{ league.short }}
      </button>
    </div>

    <div class="log-container" ref="logContainer">
      <div v-for="(log, index) in logs" :key="index" class="log-entry" :class="log.type">
        
        <!-- LIGNE 1 : INFOS (Heure, Pseudo, Scores, Actions) -->
        <div class="log-row info-row">
          <div class="col-time">{{ log.time }}</div>
          
          <div class="col-meta">
            <span v-if="log.userInfo" class="username" :style="{ color: log.userInfo.color }">
              {{ log.userInfo.name }}
            </span>
            <span v-else class="username system">System</span>
            
            <span v-if="log.userInfo && log.userInfo.aiInfo" class="ai-details">
              {{ log.userInfo.aiInfo }}
            </span>
            <span v-else class="ai-details">{{ log.msg }}</span>
          </div>

          <div class="col-actions">
            <!-- Actions Rapides (Couleur par défaut) -->
            <div v-if="!log.feedback && log.userInfo && log.userInfo.fullMessage" class="quick-actions">
              <span @click="saveExample(log, 'clean')" title="Marquer comme Propre" class="action-btn">✅</span>
              <span @click="saveExample(log, 'neutral')" title="Marquer comme Neutre" class="action-btn">🟧</span>
              <span @click="saveExample(log, 'toxic')" title="Marquer comme Toxique" class="action-btn">❌</span>
            </div>

            <!-- Badge de Feedback -->
            <div v-else-if="log.feedback" class="feedback-badge" :class="log.feedback">
              {{ log.feedback === 'clean' ? 'CLEAN' : (log.feedback === 'neutral' ? 'NEUTRE' : 'TOXIQUE') }}
            </div>
          </div>
        </div>

        <!-- LIGNE 2 : MESSAGE -->
        <div class="log-row message-row">
           <div class="col-indent"></div>
           <div class="col-message">
             <span class="message-content" v-if="!log.userInfo || !log.userInfo.fullMessage">{{ log.msg }}</span>
             <span class="message-content full-text" v-else v-html="highlightMessage(log.userInfo)"></span>
           </div>
        </div>

      </div>
      
      <div v-if="logs.length === 0" class="empty-state">
        <div class="empty-content">
          <p>En attente de messages...</p>
          <p v-if="!settings.isEnabled" style="color: #ffaa00">⚠️ LE SCAN EST DÉSACTIVÉ</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'

const logs = ref([])
const logContainer = ref(null)
const autoScroll = ref(true)

const leagues = [
  { id: "color-league-grey", short: "Gry", label: "Gris", color: "#aaaaaa" },
  { id: "color-league-bronze", short: "Brz", label: "Bronze", color: "#cd7f32" },
  { id: "color-league-silver", short: "Sil", label: "Argent", color: "#c9e7fe" },
  { id: "color-league-gold", short: "Gld", label: "Or", color: "#ffd700" },
  { id: "color-league-diamond", short: "Dia", label: "Diamant", color: "#d424ff" },
  { id: "color-league-royal", short: "Ryl", label: "Royal", color: "#e54500" },
]

const settings = reactive({
  isEnabled: false,
  isAutoMuteActive: false,
  activeLeagues: ["color-league-grey"]
})

const loadSettings = () => {
  if (!chrome.runtime?.id) return;
  chrome.storage.local.get({
    isEnabled: false,
    isAutoMuteActive: false,
    activeLeagues: ["color-league-grey"]
  }, (items) => {
    settings.isEnabled = items.isEnabled;
    settings.isAutoMuteActive = items.isAutoMuteActive;
    settings.activeLeagues = items.activeLeagues;
  });
}

const toggleSetting = (key) => {
  if (!chrome.runtime?.id) return;
  settings[key] = !settings[key];
  saveSettings();
}

const toggleLeague = (leagueId) => {
  if (!chrome.runtime?.id) return;
  const index = settings.activeLeagues.indexOf(leagueId);
  if (index === -1) {
    settings.activeLeagues.push(leagueId);
  } else {
    settings.activeLeagues.splice(index, 1);
  }
  saveSettings();
}

const saveSettings = () => {
  if (!chrome.runtime?.id) return;
  try {
    chrome.storage.local.set({
      isEnabled: settings.isEnabled,
      isAutoMuteActive: settings.isAutoMuteActive,
      activeLeagues: [...settings.activeLeagues]
    });
  } catch (e) { console.warn("Storage error", e); }
}

const clearLogs = () => {
  logs.value = []
}

const highlightMessage = (userInfo) => {
  let text = userInfo.fullMessage;
  if (userInfo.found) {
    // Échapper les caractères spéciaux de la regex
    const escaped = userInfo.found.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try {
      const regex = new RegExp("(" + escaped + ")", "gi");
      text = text.replace(regex, "<b style='color:#ff5555; text-decoration:underline; background:rgba(255,0,0,0.1);'>$1</b>");
    } catch (e) { console.error("Regex error", e); }
  }
  return text;
}

const saveExample = (log, label) => {
  log.feedback = label;
  const text = log.userInfo.fullMessage;
  if (!chrome.runtime?.id) return;
  chrome.storage.local.get({ trainingDataset: [] }, (items) => {
    const data = items.trainingDataset;
    if (!data.some(d => d.text === text)) {
      data.push({ text, label, date: Date.now() });
      chrome.storage.local.set({ trainingDataset: data });
    }
  });
}

const scrollToBottom = () => {
  if (autoScroll.value && logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight;
  }
}

onMounted(() => {
  loadSettings();
  chrome.storage.onChanged.addListener((changes, ns) => {
    if (ns === 'local') {
      if (changes.isEnabled) settings.isEnabled = changes.isEnabled.newValue;
      if (changes.isAutoMuteActive) settings.isAutoMuteActive = changes.isAutoMuteActive.newValue;
      if (changes.activeLeagues) settings.activeLeagues = changes.activeLeagues.newValue;
    }
  });

  let port = null;

  const connectToBackground = () => {
    try {
      port = chrome.runtime.connect({ name: 'devtools-panel' });
      
      port.postMessage({ type: 'init', tabId: chrome.devtools.inspectedWindow.tabId });
      
      port.onMessage.addListener((message) => {
        if (message.type === 'LOG') {
          logs.value.push({
            time: new Date().toLocaleTimeString(),
            type: message.logType,
            msg: message.msg,
            userInfo: message.userInfo,
            feedback: null
          });
          if (logs.value.length > 500) logs.value.shift();
          nextTick(scrollToBottom);
        }
      });

      port.onDisconnect.addListener(() => {
        console.warn("[AM-Knight] DevTools port disconnected. Reconnecting...");
        port = null;
        setTimeout(connectToBackground, 1000);
      });

      console.log("[AM-Knight] DevTools port connected.");

    } catch (e) {
      console.error("[AM-Knight] Connection failed", e);
      setTimeout(connectToBackground, 2000);
    }
  };

  connectToBackground();
})
</script>

<style>
body {
  margin: 0; padding: 0; background: #1e1e1e; color: #ddd;
  font-family: 'Consolas', 'Monaco', monospace; font-size: 14px;
}

.devtools-panel { display: flex; flex-direction: column; height: 100vh; }

.panel-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 12px; background: #252526; border-bottom: 1px solid #333; flex-shrink: 0;
}

.header-left { display: flex; align-items: center; gap: 8px; }
.logo { width: 20px; height: 20px; }
.title { font-weight: bold; color: #fff; font-size: 13px; letter-spacing: 0.5px; }

.header-controls { display: flex; gap: 8px; }
.btn-toggle {
  background: #333; color: #888; border: 1px solid #444; border-radius: 3px;
  padding: 4px 12px; font-size: 12px; font-family: inherit; font-weight: bold;
  cursor: pointer; transition: all 0.2s; min-width: 90px;
}
.btn-toggle.active { background: #2e7d32; color: #fff; border-color: #1b5e20; }
.btn-toggle.active.danger { background: #c62828; border-color: #b71c1c; }
.btn-toggle:hover { opacity: 0.9; }

.header-right { display: flex; align-items: center; gap: 10px; }
.count { color: #666; font-size: 12px; min-width: 30px; text-align: right; }
.btn-clear {
  background: transparent; border: 1px solid #444; color: #888;
  padding: 3px 8px; border-radius: 3px; cursor: pointer; font-size: 12px;
}
.btn-clear:hover { background: #333; color: #fff; }

.leagues-bar {
  display: flex; align-items: center; gap: 8px; padding: 8px 12px;
  background: #1e1e1e; border-bottom: 1px solid #333; flex-wrap: wrap;
}
.leagues-bar .label { color: #666; font-size: 11px; text-transform: uppercase; margin-right: 4px; }
.league-chip {
  background: transparent; border: 1px solid #555; color: #888;
  padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: bold;
  cursor: pointer; transition: all 0.2s;
}
.league-chip:hover { background: rgba(255,255,255,0.1) !important; }
.league-chip.active { text-shadow: 0 1px 2px rgba(0,0,0,0.5); border-color: transparent !important; }

.log-container { flex-grow: 1; overflow-y: auto; padding: 0; background: #1e1e1e; }

.log-entry {
  display: flex; flex-direction: column;
  padding: 8px 12px; border-bottom: 1px solid #2a2a2a;
}
.log-entry:hover { background: #252526; }
.log-entry.action { background: rgba(255, 51, 51, 0.08); border-left: 3px solid #ff3333; }
.log-entry.warn { border-left: 3px solid #ffcc00; }
.log-entry.info { border-left: 3px solid #00ccff; }
.log-entry.safe { border-left: 3px solid #444; }

.info-row { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
.col-time { color: #666; font-size: 11px; white-space: nowrap; }
.col-meta { display: flex; align-items: center; gap: 8px; flex-grow: 1; overflow: hidden; }
.username { font-weight: bold; white-space: nowrap; font-size: 13px; }
.ai-details { color: #888; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.col-actions { display: flex; align-items: center; min-width: 60px; justify-content: flex-end; }
.quick-actions { display: flex; gap: 8px; }
.action-btn { cursor: pointer; font-size: 16px; transition: transform 0.1s; }
.action-btn:hover { transform: scale(1.3); }

.feedback-badge {
  font-size: 9px; font-weight: 900; padding: 1px 5px; border-radius: 3px;
}
.feedback-badge.clean { background: #4cd964; color: #000; }
.feedback-badge.neutral { background: #ffcc00; color: #000; }
.feedback-badge.toxic { background: #ff3b30; color: #fff; }

.message-row { display: flex; }
.col-indent { width: 55px; flex-shrink: 0; } /* Aligné sous le temps */
.col-message { font-size: 14px; line-height: 1.4; color: #ddd; word-break: break-word; flex-grow: 1; }

.action .col-message { color: #ffaaaa; }
.warn .col-message { color: #ffeebb; }

.empty-state { display: flex; justify-content: center; align-items: center; height: 100%; color: #444; text-align: center; }

::-webkit-scrollbar { width: 12px; }
::-webkit-scrollbar-track { background: #1e1e1e; }
::-webkit-scrollbar-thumb { background: #333; border: 3px solid #1e1e1e; border-radius: 6px; }
::-webkit-scrollbar-thumb:hover { background: #444; }
</style>