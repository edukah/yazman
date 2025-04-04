import defaultWords from './tr.js';

class Language {
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
Language.words = new Map();

Language.load(defaultWords);

if (window.lang != null) {
  Language.load(window.lang);
}

export default Language;
