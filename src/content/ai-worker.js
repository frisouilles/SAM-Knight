import { pipeline, env } from '@xenova/transformers';

// Configuration pour l'environnement extension
env.allowLocalModels = true; 
env.allowRemoteModels = false; 
env.useBrowserCache = false; // DESACTIVÉ : non supporté par les extensions (chrome-extension://)

// Configuration des chemins locaux (IMPORTANT)
env.localModelPath = self.location.origin + '/'; 

// Configuration WASM
env.backends.onnx.wasm.wasmPaths = self.location.origin + '/wasm/';
env.backends.onnx.wasm.numThreads = 1; 

let classifier = null;

async function initModel() {
    try {
        console.log("[AM-Knight] [Transformers-Worker] Chargement du modèle LOCAL (BERT-Tiny)...");
        
        // Comme env.localModelPath est défini sur la racine, on donne juste le nom du dossier
        classifier = await pipeline('text-classification', 'model', {
            local_files_only: true,
            quantized: false // FORCE l'usage de model.onnx au lieu de chercher onnx/model_quantized.onnx
        });

        console.log("[AM-Knight] [Transformers-Worker] IA EXPERTE PRÊTE.");
        self.postMessage({ type: 'READY' });
    } catch (e) {
        console.error("[AM-Knight] [Transformers-Worker] Echec chargement:", e);
    }
}

self.onmessage = async (e) => {
    const { type, text, id } = e.data;

    if (type === 'INIT') {
        await initModel();
        return;
    }

    if (type === 'PREDICT') {
        if (!classifier) {
            self.postMessage({ type: 'RESULT', score: 0, text, id });
            return;
        }

        try {
            // Analyse du texte
            const results = await classifier(text, { top_k: null });
            
            // Sécurité : Si results n'est pas un tableau, on essaie de le convertir ou on annule
            let resultsArray = Array.isArray(results) ? results : [results];
            
            // Si c'est un tableau de tableaux (cas rare selon les versions)
            if (Array.isArray(resultsArray[0])) {
                resultsArray = resultsArray[0];
            }

            // Extraction du score avec valeurs par défaut
            const toxicResult = resultsArray.find(r => r && (r.label === 'negative' || r.label === 'LABEL_1' || r.label === 'toxic'));
            const score = (toxicResult && typeof toxicResult.score === 'number') ? toxicResult.score : 0;
            
            // DIAGNOSTIC : On prépare le log pour voir ce qui se passe vraiment
            const diagInfo = resultsArray.map(r => `${r.label}:${(r.score*100).toFixed(0)}%`).join(', ');
            
            console.log(`[Transformers] Scan: "${(text || "").substring(0, 20)}..." | Toxic: ${(score*100).toFixed(1)}% | Diag: ${diagInfo}`);

            self.postMessage({ 
                type: 'RESULT', 
                score: score, 
                label: score > 0.8 ? 'toxic' : 'clean', 
                text: text || "", 
                id,
                diag: diagInfo // On envoie toujours le diagnostic pour le moment
            });

        } catch (err) {
            console.error("[Transformers-Worker] Predict Error:", err);
            self.postMessage({ type: 'RESULT', score: 0, text, id });
        }
    }
};
