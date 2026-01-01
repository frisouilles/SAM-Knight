import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import Options from './Options.vue';

// Mock chrome.storage
global.chrome = {
  storage: {
    local: {
      get: vi.fn((defaults, cb) => cb(defaults)),
      set: vi.fn((data, cb) => cb && cb()),
    },
  },
};

describe('Options Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load settings on mount', () => {
    mount(Options);
    expect(global.chrome.storage.local.get).toHaveBeenCalled();
  });

  it('should correctly parse blacklist text into array on save', async () => {
    const wrapper = mount(Options);
    
    // Simuler la saisie utilisateur
    const textarea = wrapper.find('textarea');
    await textarea.setValue(`mot1, mot2
 mot3`);
    
    const button = wrapper.find('button');
    await button.trigger('click');
    
    expect(global.chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({
        customBlacklist: ['mot1', 'mot2', 'mot3']
      }),
      expect.any(Function)
    );
  });

  it('should filter out empty entries', async () => {
    const wrapper = mount(Options);
    const textarea = wrapper.find('textarea');
    await textarea.setValue('word1,,  ,word2\n\nword3');
    
    await wrapper.find('button').trigger('click');
    
    expect(global.chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({
        customBlacklist: ['word1', 'word2', 'word3']
      }),
      expect.any(Function)
    );
  });
});