import { expect } from '@esm-bundle/chai';
import Yazman from '../src/js/index.js';

export { expect, Yazman };

export function createEditor (options = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const editor = new Yazman(container, options);

  return { editor, container };
}

export function destroyEditor ({ editor, container }) {
  editor.destroy();
  container.remove();
}
