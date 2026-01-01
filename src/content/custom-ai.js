/**
 * Pont simplifié pour Transformers.js
 * La logique lourde est maintenant déportée entièrement dans le Worker
 */
export class CustomAI {
    constructor() {
        this.ready = false;
    }

    async load() {
        // Le chargement réel est fait par le worker via le message 'INIT'
        this.ready = true;
        return true;
    }

    // Cette méthode n'est plus appelée directement car le worker fait tout
    preprocess(text) {
        return text;
    }

    // Predict est maintenant géré par le message passing via ai-bridge.js
    async predict(text) {
        return 0; 
    }
}