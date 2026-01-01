"use strict";

/**
 * Implémentation de l'algorithme Aho-Corasick pour la recherche multi-mot efficace.
 */
export class AhoCorasick {
    constructor(keywords) {
        this.trie = [{ next: {}, failure: 0, output: [] }];
        this.buildTrie(keywords);
        this.buildFailureLinks();
    }

    buildTrie(keywords) {
        for (const keyword of keywords) {
            let node = 0;
            for (const char of keyword) {
                if (!this.trie[node].next[char]) {
                    this.trie[node].next[char] = this.trie.length;
                    this.trie.push({ next: {}, failure: 0, output: [] });
                }
                node = this.trie[node].next[char];
            }
            this.trie[node].output.push(keyword);
        }
    }

    buildFailureLinks() {
        const queue = [];
        for (const char in this.trie[0].next) {
            const child = this.trie[0].next[char];
            queue.push(child);
        }

        while (queue.length > 0) {
            const u = queue.shift();
            for (const char in this.trie[u].next) {
                const v = this.trie[u].next[char];
                let f = this.trie[u].failure;
                while (f > 0 && !this.trie[f].next[char]) {
                    f = this.trie[f].failure;
                }
                this.trie[v].failure = this.trie[f].next[char] || 0;
                this.trie[v].output = this.trie[v].output.concat(this.trie[this.trie[v].failure].output);
                queue.push(v);
            }
        }
    }

    search(text) {
        const results = [];
        let node = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            while (node > 0 && !this.trie[node].next[char]) {
                node = this.trie[node].failure;
            }
            node = this.trie[node].next[char] || 0;
            if (this.trie[node].output.length > 0) {
                for (const word of this.trie[node].output) {
                    results.push({ word, index: i - word.length + 1 });
                }
            }
        }
        return results;
    }
}

/**
 * Implémentation simplifiée d'un Filtre de Bloom.
 */
export class BloomFilter {
    constructor(size = 1000, hashCount = 3) {
        this.size = size;
        this.hashCount = hashCount;
        this.bitset = new Uint8Array(Math.ceil(size / 8));
    }

    _hash(item, seed) {
        let hash = seed;
        for (let i = 0; i < item.length; i++) {
            hash = (hash * 31 + item.charCodeAt(i)) % this.size;
        }
        return hash;
    }

    add(item) {
        for (let i = 0; i < this.hashCount; i++) {
            const h = this._hash(item, i);
            this.bitset[h >> 3] |= (1 << (h & 7));
        }
    }

    mightContain(item) {
        for (let i = 0; i < this.hashCount; i++) {
            const h = this._hash(item, i);
            if (!(this.bitset[h >> 3] & (1 << (h & 7)))) {
                return false;
            }
        }
        return true;
    }
}
