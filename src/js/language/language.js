import trWords from './tr.js';
import enWords from './en.js';

class Language {
  static words = new Map();
  static #locales = new Map([['tr', trWords], ['en', enWords]]);
  static #defaultCode = 'en';

  static init (langCode = 'auto') {
    this.words.clear();

    if (langCode === 'auto' || !langCode) {
      langCode = document.documentElement.lang || this.#defaultCode;
    }

    const translations = this.#locales.get(langCode)
      ?? this.#locales.get(langCode.split('-')[0])
      ?? this.#locales.get(this.#defaultCode);

    this.load(translations);

    if (globalThis.LANG_DATA != null) {
      this.load(globalThis.LANG_DATA);
    }
  }

  static load (translations) {
    Object.entries(translations).forEach(elem => {
      this.set(elem[0], elem[1]);
    });
  }

  static get (key) {
    return Language.words.get(key);
  }

  static getAll () {
    return Language.words;
  }

  static set (key, value) {
    return Language.words.set(key, value);
  }

  static delete (key) {
    return Language.words.delete(key);
  }
}

// Auto-initialize
Language.init();

export default Language;
