<template>
  <div class="options-container">
    <h1>Configuration Auto-Mute Knight</h1>
    
    <div class="section">      <h2>Blacklist Personnalisée</h2>
      <p class="help">Ajoutez ici des mots ou expressions à bannir (un par ligne ou séparés par des virgules).</p>
      <textarea v-model="blacklistText" placeholder="exemple, mot interdit, spam"></textarea>
    </div>

    <div class="section">
      <h2>Whitelist Personnalisée</h2>
      <p class="help">Ajoutez ici des mots autorisés (un par ligne ou séparés par des virgules).</p>
      <textarea v-model="whitelistText" placeholder="bonjour, ça va, ..."></textarea>
    </div>

    <button @click="saveOptions" :disabled="saving">
      {{ saving ? 'Enregistrement...' : 'Enregistrer les modifications' }}
    </button>
    
    <div v-if="statusMsg" class="status" :class="statusType">
      {{ statusMsg }}
    </div>

    <hr style="border: 0; border-top: 1px solid #444; margin: 30px 0;">

    <div class="section">
      <h2>🎛️ Réglages de Sensibilité</h2>
      <p class="help">Définissez les zones de tolérance pour l'IA.</p>
      
      <div class="threshold-visualizer">
        <div class="zone clean" :style="{ width: (cleanThreshold * 100) + '%' }">Clean</div>
        <div class="zone neutral" :style="{ width: ((toxicThreshold - cleanThreshold) * 100) + '%' }">Neutre</div>
        <div class="zone toxic" :style="{ width: ((1 - toxicThreshold) * 100) + '%' }">Toxique</div>
      </div>

      <div class="control-group">
        <label>Limite Clean / Neutre ({{ (cleanThreshold * 100).toFixed(0) }}%)</label>
        <input type="range" v-model.number="cleanThreshold" min="0.1" :max="toxicThreshold - 0.05" step="0.05">
        <p class="help-text">En dessous de ce score, le message est considéré comme sûr.</p>
      </div>

      <div class="control-group">
        <label>Limite Neutre / Toxique ({{ (toxicThreshold * 100).toFixed(0) }}%)</label>
        <input type="range" v-model.number="toxicThreshold" :min="cleanThreshold + 0.05" max="0.95" step="0.05">
        <p class="help-text">Au dessus de ce score, le message est banni.</p>
      </div>

      <div class="control-group">
        <label>Action pour les messages Neutres</label>
        <select v-model="neutralAction">
          <option value="highlight">Mettre en évidence (Orange)</option>
          <option value="hide">Griser / Masquer partiellement</option>
          <option value="ignore">Ne rien faire</option>
        </select>
      </div>
    </div>

    <hr style="border: 0; border-top: 1px solid #444; margin: 30px 0;">

    <div class="section">
      <h2>🏅 Tolérance par Ligue</h2>
      <p class="help">Ajustez le niveau de confiance par défaut pour chaque ligue (utilisé à titre indicatif ou pour des modes avancés).</p>
      <div v-for="league in leagues" :key="league.id" class="control-group">
         <label :style="{ color: league.color }">{{ league.label }} ({{ (leagueSettings[league.id] * 100).toFixed(0) }}%)</label>
         <input type="range" v-model.number="leagueSettings[league.id]" min="0.1" max="1.0" step="0.01">
      </div>
    </div>

    <hr style="border: 0; border-top: 1px solid #444; margin: 30px 0;">

    <div class="section">
      <h2>🧠 Dataset IA (Entraînement)</h2>
      <p class="help">Données récoltées manuellement pour entraîner le futur modèle personnalisé.</p>
      
      <div class="stats-box">
        <div class="stat-item">
          <span class="stat-value">{{ datasetStats.total }}</span>
          <span class="stat-label">Total Messages</span>
        </div>
        <div class="stat-item" style="color: #4cd964;">
          <span class="stat-value">{{ datasetStats.clean }}</span>
          <span class="stat-label">✅ Clean</span>
        </div>
        <div class="stat-item" style="color: #ff9500;">
          <span class="stat-value">{{ datasetStats.neutral }}</span>
          <span class="stat-label">⚖️ Neutre</span>
        </div>
        <div class="stat-item" style="color: #ff3b30;">
          <span class="stat-value">{{ datasetStats.toxic }}</span>
          <span class="stat-label">❌ Toxic</span>
        </div>
      </div>

      <div class="actions-row">
        <button @click="downloadCsv" class="btn-secondary" :disabled="datasetStats.total === 0">
          📥 Exporter le CSV
        </button>
        <button @click="triggerImport" class="btn-secondary">
          📤 Importer un CSV
        </button>
        <input type="file" ref="importInput" @change="handleImport" accept=".csv" style="display:none;">
        <button @click="refreshStats" class="btn-secondary">
          🔄 Actualiser
        </button>
        <button @click="clearDataset" class="btn-danger" :disabled="datasetStats.total === 0">
          🗑️ Vider le Dataset
        </button>
      </div>
      
      <p v-if="datasetStats.total > 0" class="mini-preview">
        Dernier ajout : {{ lastAdded }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'

const blacklistText = ref('')
const whitelistText = ref('')
const saving = ref(false)
const statusMsg = ref('')
const statusType = ref('success')
const cleanThreshold = ref(0.40)
const toxicThreshold = ref(0.70)
const neutralAction = ref('highlight')

const leagues = ref([
  { id: "color-league-grey", label: "Gry", color: "#aaaaaa" },
  { id: "color-league-bronze", label: "Bronze", color: "#cd7f32" },
  { id: "color-league-silver", label: "Argent", color: "#c9e7fe" },
  { id: "color-league-gold", label: "Or", color: "#ffd700" },
  { id: "color-league-diamond", label: "Diamant", color: "#d424ff" },
  { id: "color-league-royal", label: "Royal", color: "#e54500" },
])

const leagueSettings = ref({
  "color-league-grey": 0.70,
  "color-league-bronze": 0.80,
  "color-league-silver": 0.85,
  "color-league-gold": 0.90,
  "color-league-diamond": 0.95,
  "color-league-royal": 0.98
})

const trainingData = ref([])
const importInput = ref(null)

const triggerImport = () => {
  importInput.value.click()
}

const handleImport = (e) => {
  const file = e.target.files[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (event) => {
    const text = event.target.result
    const lines = text.split(/\r\n|\n/)
    let importedCount = 0
    
    chrome.storage.local.get({ trainingDataset: [] }, (items) => {
      const currentData = items.trainingDataset
      const currentTexts = new Set(currentData.map(d => d.text))
      
      lines.forEach(line => {
        const matches = line.match(/^(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|([^,]*)),(.*)$/)
        if (matches) {
          let msgText = matches[1] || matches[2]
          const label = matches[3].trim()
          
          if (msgText && label && (label === "clean" || label === "neutral" || label.includes("toxic"))) {
            msgText = msgText.replace(/\"\"/g, '"').trim()
            if (!currentTexts.has(msgText) && msgText !== "text") {
               currentData.push({ text: msgText, label: label, date: Date.now() })
               currentTexts.add(msgText)
               importedCount++
            }
          }
        }
      })
      
      chrome.storage.local.set({ trainingDataset: currentData }, () => {
        refreshStats()
        statusMsg.value = `Import terminé : ${importedCount} nouveaux messages ajoutés.`
        statusType.value = 'success'
        setTimeout(() => { statusMsg.value = '' }, 5000)
      })
    })
  }
  reader.readAsText(file)
  e.target.value = ''
}

const datasetStats = computed(() => {
  const clean = trainingData.value.filter(d => d.label === 'clean').length
  const neutral = trainingData.value.filter(d => d.label === 'neutral').length
  const toxic = trainingData.value.filter(d => d.label === 'toxic').length
  return {
    total: trainingData.value.length,
    clean,
    neutral,
    toxic
  }
})

const lastAdded = computed(() => {
    if (trainingData.value.length === 0) return 'Aucun';
    const last = trainingData.value[trainingData.value.length - 1];
    return `[${last.label}] ${last.text.substring(0, 50)}...`;
})

const refreshStats = () => {
  chrome.storage.local.get({ trainingDataset: [] }, (items) => {
    trainingData.value = items.trainingDataset
  })
}

const downloadCsv = () => {
    if (trainingData.value.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,text,label\n";
    trainingData.value.forEach(function(row) {
      const safeText = row.text.replace(/"/g, '""').replace(/\n/g, " ");
      csvContent += `"${safeText}",${row.label}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `stripchat_dataset_${trainingData.value.length}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

const clearDataset = () => {
    if (!confirm("Voulez-vous vraiment effacer TOUTES les données d'entraînement ?")) return;
    chrome.storage.local.set({ trainingDataset: [] }, () => {
        refreshStats();
        statusMsg.value = 'Dataset effacé.';
        statusType.value = 'success';
        setTimeout(() => { statusMsg.value = '' }, 3000);
    });
}

onMounted(() => {
  chrome.storage.local.get({
    customBlacklist: [],
    customWhitelist: [],
    trainingDataset: [],
    isAutoMuteActive: false,
    cleanThreshold: 0.40,
    toxicThreshold: 0.70,
    neutralAction: 'highlight',
    leagueTolerances: {} 
  }, (items) => {
    blacklistText.value = items.customBlacklist.join('\n')
    whitelistText.value = items.customWhitelist.join('\n')
    trainingData.value = items.trainingDataset
    cleanThreshold.value = items.cleanThreshold
    toxicThreshold.value = items.toxicThreshold
    neutralAction.value = items.neutralAction
    // Merge defaults with stored values
    if (items.leagueTolerances) {
       leagueSettings.value = { ...leagueSettings.value, ...items.leagueTolerances }
    }
  })
})

const saveOptions = () => {
  saving.value = true
  
  const blacklistArray = blacklistText.value
    .split(/[\n,]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    
  const whitelistArray = whitelistText.value
    .split(/[\n,]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  chrome.storage.local.set({
    customBlacklist: blacklistArray,
    customWhitelist: whitelistArray,
    cleanThreshold: cleanThreshold.value,
    toxicThreshold: toxicThreshold.value,
    neutralAction: neutralAction.value,
    leagueTolerances: leagueSettings.value
  }, () => {
    saving.value = false
    statusMsg.value = 'Options enregistrées !'
    statusType.value = 'success'
    setTimeout(() => { statusMsg.value = '' }, 3000)
  })
}
</script>

<style scoped>
.control-group {
  margin-bottom: 15px;
  background: #333;
  padding: 10px;
  border-radius: 4px;
}
.control-group label {
  display: block;
  font-weight: bold;
  margin-bottom: 5px;
}
.help-text {
  font-size: 0.8em;
  color: #aaa;
  margin-top: 5px;
}
input[type="range"] {
  width: 100%;
}
select {
  width: 100%;
  padding: 8px;
  background: #444;
  color: white;
  border: 1px solid #555;
  border-radius: 4px;
}
.options-container {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #222;
  color: #eee;
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

h1 { border-bottom: 1px solid #444; padding-bottom: 10px; }
h2 { font-size: 1.2em; margin-top: 20px; color: #aaa; }

.section { margin-bottom: 20px; }

.stats-box {
    display: flex;
    gap: 20px;
    background: #333;
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 15px;
}

.stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 80px;
}

.stat-value { font-size: 1.5em; font-weight: bold; }
.stat-label { font-size: 0.8em; color: #aaa; }

.actions-row {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
}

.mini-preview { font-size: 0.8em; color: #666; font-style: italic; }

textarea {
  width: 100%;
  height: 150px;
  background: #333;
  color: #fff;
  border: 1px solid #555;
  padding: 10px;
  font-family: monospace;
  box-sizing: border-box;
}

.help { font-size: 0.9em; color: #888; margin-bottom: 5px; }

button {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 1em;
  margin-top: 20px;
  border-radius: 4px;
}

.btn-secondary { background: #555; margin-top: 0; font-size: 0.9em; }
.btn-secondary:hover:not(:disabled) { background: #777; }

.btn-danger { background: #d32f2f; margin-top: 0; font-size: 0.9em; }
.btn-danger:hover:not(:disabled) { background: #b71c1c; }

button:hover:not(:disabled) { background: #0056b3; }
button:disabled { opacity: 0.5; cursor: not-allowed; }

.status {
  margin-top: 10px;
  padding: 10px;
  border-radius: 4px;
}
.success { background: #28a745; color: #fff; }

.threshold-visualizer {
  display: flex;
  height: 20px;
  background: #333;
  margin-bottom: 20px;
  border-radius: 10px;
  overflow: hidden;
}

.zone {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7em;
  color: #fff;
  transition: width 0.3s ease;
}

.zone.clean { background: #4cd964; color: #000; }
.zone.neutral { background: #ff9500; }
.zone.toxic { background: #ff3b30; }
</style>