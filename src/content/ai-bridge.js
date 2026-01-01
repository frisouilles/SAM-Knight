/**
 * Gère la communication avec le Web Worker TensorFlow
 */
export class AIBridge {
    constructor(worker) {
        this.worker = worker;
        this.ready = false;
        this.callbacks = new Map();
        this.requestId = 0;
        
        if (this.worker) {
            this.worker.onmessage = (e) => {
                if (e.data.type === 'READY') {
                    this.ready = true;
                    console.info("[AM-Knight] [AI-Bridge] IA prête et chargée.");
                }
                if (e.data.type === 'RESULT') {
                    // console.log(`[AM-Knight] [AI-Bridge] Résultat reçu (ID: ${e.data.id})`);
                    const cb = this.callbacks.get(e.data.id);
                    if (cb) {
                        cb({ 
                            score: e.data.score, 
                            label: e.data.label,
                            diag: e.data.diag // Relais du diagnostic
                        });
                        this.callbacks.delete(e.data.id);
                    }
                }
            };
        }
    }

    async init(vocab = {}) {
        if (this.worker) {
            console.log("[AM-Knight] [AI-Bridge] Initialisation du Worker...");
            this.worker.postMessage({ type: 'INIT', config: { vocab } });
        }
    }

    check(text) {
        return new Promise((resolve) => {
            if (!this.ready || !this.worker) {
                // On log pourquoi on ne check pas
                if (!this.ready) console.warn("[AM-Knight] [AI-Bridge] IA pas encore prête, scan ignoré.");
                return resolve(0);
            }
            
            this.requestId++;
            const id = this.requestId;
            
            // console.log(`[AM-Knight] [AI-Bridge] Envoi au Worker (ID: ${id}): "${text.substring(0, 20)}..."`);
            this.callbacks.set(id, resolve);
            this.worker.postMessage({ type: 'PREDICT', text, id });
        });
    }
}