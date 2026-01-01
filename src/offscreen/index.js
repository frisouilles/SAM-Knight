import { AIBridge } from '../content/ai-bridge.js';

// On utilise le même bridge, mais ici on est dans l'origin de l'extension !
const workerUrl = chrome.runtime.getURL('assets/ai-worker.js');
const aiWorker = new Worker(workerUrl, { type: 'module' });
const bridge = new AIBridge(aiWorker);

console.log("[AM-Knight] [Offscreen] Document chargé, Worker IA initialisé.");

// On initialise l'IA dès le chargement
bridge.init();

// Écoute les messages du Background Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'AI_CHECK') {
        bridge.check(message.text)
            .then(result => {
                sendResponse(result);
            })
            .catch(err => {
                console.error("[AM-Knight] [Offscreen] Erreur AI check:", err);
                sendResponse(null);
            });
        return true; // Garde le canal ouvert pour la réponse asynchrone
    }
});
