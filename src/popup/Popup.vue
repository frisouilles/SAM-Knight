<template>
  <div class="popup-container">
    <h3>Auto-Mute Knight</h3>
    <div class="status-indicator">
      <div class="control-row">
        <span>Scan Active</span>
        <label class="switch">
          <input type="checkbox" v-model="isEnabled" @change="saveSettings">
          <span class="slider"></span>
        </label>
      </div>
      <div class="control-row" :style="{ opacity: isEnabled ? 1 : 0.3 }">
        <span>Auto-Mute</span>
        <label class="switch">
          <input type="checkbox" v-model="isAutoMuteActive" @change="saveSettings" :disabled="!isEnabled">
          <span class="slider"></span>
        </label>
      </div>
      <div class="control-row">
        <span>Console</span>
        <label class="switch">
          <input type="checkbox" v-model="isUiVisible" @change="saveSettings">
          <span class="slider"></span>
        </label>
      </div>
    </div>
    <div class="status" :class="{ enabled: isEnabled }">
      {{ isEnabled ? 'ENABLED' : 'DISABLED' }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const isEnabled = ref(false)
const isAutoMuteActive = ref(false)
const isUiVisible = ref(false)

onMounted(() => {
  chrome.storage.local.get(['isEnabled', 'isAutoMuteActive', 'isUiVisible'], (items) => {
    isEnabled.value = items.isEnabled || false
    isAutoMuteActive.value = items.isAutoMuteActive || false
    isUiVisible.value = items.isUiVisible || false
  })
})

const saveSettings = () => {
  chrome.storage.local.set({
    isEnabled: isEnabled.value,
    isAutoMuteActive: isAutoMuteActive.value,
    isUiVisible: isUiVisible.value
  })
}
</script>

<style scoped>
.popup-container {
  width: 160px;
  padding: 15px;
  font-family: sans-serif;
  background: #222;
  color: #fff;
  text-align: center;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.control-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: bold;
}

.status {
  margin-top: 10px;
  font-size: 10px;
  color: #aaa;
}

.status.enabled {
  color: #00cc00;
}

/* Toggle Switch Styles */
.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #555;
  transition: .4s;
  border-radius: 20px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #00cc00;
}

input:checked + .slider:before {
  transform: translateX(20px);
}
</style>
