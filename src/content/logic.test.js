import { describe, it, expect, beforeEach, vi } from 'vitest';
import { normalizeText, levenshteinDistance, fuzzyCheck, checkFlood, checkCaps, evaluateAIResult } from './logic.js';
import { AhoCorasick, BloomFilter } from './algorithms.js';

describe('Logic Utilities', () => {
  
  describe('normalizeText', () => {
    it('should handle accents and case', () => {
      expect(normalizeText('Pûté')).toBe('pute');
      expect(normalizeText('SâloPé')).toBe('salope');
    });

    it('should handle complex leetspeak substitutions', () => {
      expect(normalizeText('p0rn')).toBe('porn');
      expect(normalizeText('5lut')).toBe('slut');
      expect(normalizeText('h!elle')).toBe('hielle');
      expect(normalizeText('qu37te')).toBe('quette');
      expect(normalizeText('v1ol')).toBe('viol');
      expect(normalizeText('@ss')).toBe('ass');
      expect(normalizeText('l0l1t4')).toBe('lolita');
      expect(normalizeText('b1tch')).toBe('bitch');
    });

    it('should handle various unicode spaces and tabs', () => {
      expect(normalizeText('word1\tword2')).toBe('wordi word2');
      expect(normalizeText('word1\u00A0word2')).toBe('wordi word2');
      expect(normalizeText('  word1   word2  ')).toBe('wordi word2');
    });

    it('should handle strings with only special characters', () => {
      expect(normalizeText('!!! ??? ///')).toBe('');
      expect(normalizeText('123')).toBe('i2e');
    });

    it('should NOT replace exclamation marks if they are punctuation', () => {
      expect(normalizeText('Hello!!!')).toBe('hello');
    });

    it('should remove punctuation but keep spaces', () => {
      expect(normalizeText('hello!!! world???')).toBe('hello world');
      expect(normalizeText('   multiple   spaces   ')).toBe('multiple spaces');
    });

    it('should handle empty or null input', () => {
      expect(normalizeText('')).toBe('');
      expect(normalizeText(null)).toBe('');
    });
  });

  describe('levenshteinDistance', () => {
    it('should calculate correct distance', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
      expect(levenshteinDistance('pute', 'putte')).toBe(1);
      expect(levenshteinDistance('abc', '')).toBe(3);
    });
  });

  describe('fuzzyCheck', () => {
    const badWords = ['salope', 'connard', 'pute'];
    const ahoCorasick = new AhoCorasick(badWords);

    test('should detect exact match via Aho-Corasick', () => {
      const aho = new AhoCorasick(['test', 'mot']);
      const result = fuzzyCheck('ceci est un test', aho, null, ['test']);
      expect(result).not.toBeNull();
      expect(result.type).toBe('MOT_INTERDIT');
      expect(result.found).toBe('test');
    });

    test('should NOT detect partial match via Aho-Corasick (Word Boundaries)', () => {
      // "pet" ne doit pas être détecté dans "petit"
      const aho = new AhoCorasick(['pet']);
      const result = fuzzyCheck('je suis un petit gris', aho, null, ['pet']);
      expect(result).toBeNull();
    });

    test('should detect whole word match via Aho-Corasick', () => {
      const aho = new AhoCorasick(['pet']);
      const result = fuzzyCheck('un gros pet', aho, null, ['pet']);
      expect(result).not.toBeNull();
      expect(result.found).toBe('pet');
    });

    it('should detect fuzzy match for similar words (distance 1)', () => {
      const result = fuzzyCheck('tu es une sxlope', null, null, badWords);
      expect(result).not.toBeNull();
      expect(result.type).toBe('FUZZY');
      expect(result.found).toBe('sxlope');
    });

    test('should detect fuzzy match for distance 2 on long words (9+ chars)', () => {
      // "prostituée" fait 10 lettres, donc threshold 2
      const result = fuzzyCheck('une prxstituee', null, null, ['prostituée']);
      expect(result).not.toBeNull();
      expect(result.type).toBe('FUZZY');
    });

    test('should NOT detect fuzzy match for distance 2 on medium words (6-8 chars)', () => {
      // "connard" fait 7 lettres, donc threshold 1. "cxnnxrd" a dist 2 -> doit fail
      const result = fuzzyCheck('espece de cxnnxrd', null, null, ['connard']);
      expect(result).toBeNull();
    });

    it('should NOT trigger fuzzy match for very short words to avoid false positives', () => {
      // "abc" vs "abcde" distance 2, mais mot trop court pour fuzzy
      const result = fuzzyCheck('abc', null, null, ['abcde']);
      expect(result).toBeNull();
    });

    it('should respect whitelist', () => {
      const whitelist = ['bonne'];
      const result = fuzzyCheck('tu es bonne', null, null, ['borne'], whitelist);
      expect(result).toBeNull();
    });
  });

  describe('Algorithms', () => {
    describe('AhoCorasick', () => {
      it('should find multiple keywords in text', () => {
        const ac = new AhoCorasick(['apple', 'banana', 'pear']);
        const results = ac.search('i like apple and banana');
        expect(results).toHaveLength(2);
        expect(results[0].word).toBe('apple');
        expect(results[1].word).toBe('banana');
      });

      it('should find overlapping keywords', () => {
        const ac = new AhoCorasick(['hers', 'he', 'she']);
        const results = ac.search('ushers');
        // 'she', 'he', 'hers'
        expect(results.map(r => r.word)).toContain('he');
        expect(results.map(r => r.word)).toContain('she');
        expect(results.map(r => r.word)).toContain('hers');
      });

      it('should handle empty text or no matches', () => {
        const ac = new AhoCorasick(['apple']);
        expect(ac.search('')).toHaveLength(0);
        expect(ac.search('orange')).toHaveLength(0);
      });

      it('should find keywords at the very beginning or end', () => {
        const ac = new AhoCorasick(['start', 'end']);
        const results = ac.search('start middle end');
        expect(results[0].word).toBe('start');
        expect(results[1].word).toBe('end');
      });

      it('should handle repeated keywords', () => {
        const ac = new AhoCorasick(['spam']);
        const results = ac.search('spam spam spam');
        expect(results).toHaveLength(3);
      });
    });

    describe('BloomFilter', () => {
      it('should add and check items', () => {
        const bf = new BloomFilter(100, 3);
        bf.add('test');
        expect(bf.mightContain('test')).toBe(true);
        expect(bf.mightContain('not-there')).toBe(false);
      });

      it('should never have false negatives', () => {
        const bf = new BloomFilter(1000, 4);
        const words = ['one', 'two', 'three', 'four', 'five'];
        words.forEach(w => bf.add(w));
        words.forEach(w => {
          expect(bf.mightContain(w)).toBe(true);
        });
      });
    });

    describe('AI Logic', () => {
      // Logic: Score < Clean (0.4) -> NULL
      //        0.4 <= Score < Toxic (0.7) -> NEUTRAL
      //        Score >= Toxic (0.7) -> TOXIC

      const TOXIC_THRESH = 0.70;
      const CLEAN_THRESH = 0.40;

      it('should trigger TOXIC when score >= toxicThreshold', () => {
        const result = { score: 0.75, label: 'toxic' }; // label ignored
        const match = evaluateAIResult(result, TOXIC_THRESH, CLEAN_THRESH);
        expect(match).not.toBeNull();
        expect(match.type).toBe('AI_DETECTION');
        expect(match.found).toContain('toxic');
        expect(match.found).toContain('75%');
      });

      it('should trigger NEUTRAL when score is between clean and toxic', () => {
        const result = { score: 0.50, label: 'neutral' }; // label ignored
        const match = evaluateAIResult(result, TOXIC_THRESH, CLEAN_THRESH);
        expect(match).not.toBeNull();
        expect(match.type).toBe('AI_NEUTRAL');
        expect(match.found).toContain('neutral');
        expect(match.found).toContain('50%');
      });

      it('should return NULL (Clean) when score < cleanThreshold', () => {
        const result = { score: 0.30, label: 'clean' };
        const match = evaluateAIResult(result, TOXIC_THRESH, CLEAN_THRESH);
        expect(match).toBeNull();
      });

      it('should handle exact boundary for Neutral (inclusive start)', () => {
        const result = { score: 0.40 };
        const match = evaluateAIResult(result, TOXIC_THRESH, CLEAN_THRESH);
        expect(match).not.toBeNull();
        expect(match.type).toBe('AI_NEUTRAL');
      });

      it('should handle exact boundary for Toxic (inclusive start)', () => {
        const result = { score: 0.70 };
        const match = evaluateAIResult(result, TOXIC_THRESH, CLEAN_THRESH);
        expect(match).not.toBeNull();
        expect(match.type).toBe('AI_DETECTION');
      });

      it('should handle raw score number (backward compatibility)', () => {
        const match = evaluateAIResult(0.80, TOXIC_THRESH, CLEAN_THRESH);
        expect(match).not.toBeNull();
        expect(match.type).toBe('AI_DETECTION');
        expect(match.found).toContain('toxic (80%)');
      });

      it('should handle null/empty result', () => {
        expect(evaluateAIResult(null)).toBeNull();
      });
    });
  });

  describe('checkFlood', () => {
    let history;
    beforeEach(() => {
      history = {};
    });

    it('should detect 3 identical messages', () => {
      checkFlood('user1', 'hello', history);
      checkFlood('user1', 'hello', history);
      const result = checkFlood('user1', 'hello', history);
      expect(result).toBe('FLOOD (3x identique)');
    });

    it('should NOT trigger if messages are different', () => {
      checkFlood('user1', 'hello 1', history);
      checkFlood('user1', 'hello 2', history);
      const result = checkFlood('user1', 'hello 3', history);
      expect(result).toBeNull();
    });

    it('should NOT trigger if time gap is too large (> 30s)', () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);
      checkFlood('user1', 'spam', history);
      
      vi.setSystemTime(now + 10000);
      checkFlood('user1', 'spam', history);
      
      vi.setSystemTime(now + 45000); // +35s depuis le premier
      const result = checkFlood('user1', 'spam', history);
      expect(result).toBeNull();
      vi.useRealTimers();
    });

    it('should isolate users', () => {
      checkFlood('user1', 'spam', history);
      checkFlood('user1', 'spam', history);
      const result = checkFlood('user2', 'spam', history);
      expect(result).toBeNull(); // user2 n'a envoyé qu'une fois
    });

    it('should reset after 5 messages (history window)', () => {
      checkFlood('user1', 'a', history);
      checkFlood('user1', 'b', history);
      checkFlood('user1', 'c', history);
      checkFlood('user1', 'd', history);
      checkFlood('user1', 'e', history);
      checkFlood('user1', 'f', history);
      // Le premier 'a' doit avoir disparu de l'historique
      expect(history['user1'].length).toBe(5);
      expect(history['user1'][0].text).toBe('b');
    });
  });

  describe('checkCaps', () => {
    it('should detect excessive caps (> 80%)', () => {
      expect(checkCaps('HELLO WORLD HOW ARE YOU')).not.toBeNull();
      expect(checkCaps('HELLo WORLD')).not.toBeNull(); // 9/10 caps
    });

    it('should allow normal text', () => {
      expect(checkCaps('Hello world, how are you?')).toBeNull();
    });

    it('should ignore messages with too few letters', () => {
      expect(checkCaps('HELLO')).toBeNull(); // Seulement 5 lettres
    });
  });
});
