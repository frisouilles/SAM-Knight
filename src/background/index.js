const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';
let creatingOffscreenPromise = null;
const devtoolsPorts = {}; // tabId -> port

async function setupOffscreen() {
    if (await chrome.offscreen.hasDocument()) {
        return;
    }

    if (creatingOffscreenPromise) {
        await creatingOffscreenPromise;
        return;
    }

    creatingOffscreenPromise = chrome.offscreen.createDocument({
        url: OFFSCREEN_DOCUMENT_PATH,
        reasons: [chrome.offscreen.Reason.WORKERS],
        justification: 'AI processing for message filtering',
    });

    await creatingOffscreenPromise;
    creatingOffscreenPromise = null;
}

// Gestion des connexions DevTools
chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== 'devtools-panel') return;

    let tabId;
    const extensionListener = (message) => {
        if (message.type === 'init') {
            tabId = message.tabId;
            devtoolsPorts[tabId] = port;
            console.log(`[AM-Knight] [Background] DevTools connecté pour l'onglet ${tabId}`);
        }
    };

    port.onMessage.addListener(extensionListener);
    port.onDisconnect.addListener(() => {
        port.onMessage.removeListener(extensionListener);
        if (tabId) delete devtoolsPorts[tabId];
        console.log(`[AM-Knight] [Background] DevTools déconnecté pour l'onglet ${tabId}`);
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Relais des logs vers DevTools
    if (message.type === 'LOG_TO_DEVTOOLS') {
        const tabId = sender.tab ? sender.tab.id : null;
        // console.log(`[AM-Knight] [Background] LOG_TO_DEVTOOLS received from tab ${tabId}`, message.msg);
        
        if (tabId && devtoolsPorts[tabId]) {
            devtoolsPorts[tabId].postMessage({
                type: 'LOG',
                msg: message.msg,
                logType: message.logType,
                userInfo: message.userInfo
            });
        } else {
             console.warn(`[AM-Knight] [Background] No DevTools port for tab ${tabId}. Open ports:`, Object.keys(devtoolsPorts));
        }
        return false;
    }

    if (message.type === 'AI_REQUEST') {
        // On s'assure que l'offscreen est prêt avant de relayer
        setupOffscreen()
            .then(() => {
                chrome.runtime.sendMessage({
                    type: 'AI_CHECK',
                    text: message.text
                }, (response) => {
                    // Gestion du cas où le message échoue (ex: offscreen fermé)
                    if (chrome.runtime.lastError) {
                        console.warn("[AM-Knight] [Background] Erreur communication offscreen:", chrome.runtime.lastError);
                        sendResponse(null);
                    } else {
                        if (response) {
                            const score = typeof response === 'object' ? response.score : response;
                            const diag = response.diag ? ` | ${response.diag}` : '';
                            console.log(`[AM-Knight] [AI] "${message.text.substring(0, 30)}..." -> ${(score * 100).toFixed(1)}%${diag}`);
                        }
                        sendResponse(response);
                    }
                });
            })
            .catch((err) => {
                console.error("[AM-Knight] [Background] Échec setupOffscreen:", err);
                sendResponse(null); // On répond quand même pour fermer le port proprement
            });
            
        return true; // Asynchrone
    }
});

// Création initiale au démarrage
chrome.runtime.onInstalled.addListener(() => {
    setupOffscreen();
});