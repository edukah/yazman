import { expect, Yazman, destroyEditor } from '../helpers.js';

describe('Plugin API', () => {
  // Store plugins registered during tests so we can clean up
  const registeredPlugins = [];

  function registerPlugin (name, fn) {
    Yazman.plugin(name, fn);
    registeredPlugins.push(name);
  }

  afterEach(() => {
    // Clean up registered plugins from static array
    while (registeredPlugins.length) {
      const name = registeredPlugins.pop();
      const idx = Yazman._plugins.findIndex(p => p.name === name);
      if (idx !== -1) Yazman._plugins.splice(idx, 1);
    }
  });

  it('should call plugin function with editor instance during construction', () => {
    let receivedEditor = null;
    registerPlugin('test-plugin', (editor) => { receivedEditor = editor; });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const editor = new Yazman(container);

    expect(receivedEditor).to.equal(editor);

    destroyEditor({ editor, container });
  });

  it('should call plugin destroy on editor.destroy()', () => {
    let destroyed = false;
    registerPlugin('destroyable-plugin', () => {
      return { destroy () { destroyed = true; } };
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const editor = new Yazman(container);

    editor.destroy();
    container.remove();
    expect(destroyed).to.be.true;
  });

  it('should catch plugin init error via handleError', () => {
    let errorCaught = false;
    registerPlugin('bad-plugin', () => { throw new Error('plugin init failed'); });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const editor = new Yazman(container, {
      onError: () => { errorCaught = true; }
    });

    expect(errorCaught).to.be.true;
    expect(editor).to.be.an.instanceOf(Yazman);

    destroyEditor({ editor, container });
  });

  it('should pass correct error context on plugin init failure', () => {
    let receivedContext;
    registerPlugin('ctx-plugin', () => { throw new Error('fail'); });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const editor = new Yazman(container, {
      onError: (error, context) => { receivedContext = context; }
    });

    expect(receivedContext).to.have.property('module', 'plugin');
    expect(receivedContext).to.have.property('operation', 'init');
    expect(receivedContext).to.have.property('pluginName', 'ctx-plugin');

    destroyEditor({ editor, container });
  });

  it('should initialize multiple plugins in order', () => {
    const order = [];
    registerPlugin('plugin-a', () => { order.push('a'); });
    registerPlugin('plugin-b', () => { order.push('b'); });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const editor = new Yazman(container);

    expect(order).to.deep.equal(['a', 'b']);

    destroyEditor({ editor, container });
  });

  it('should not crash editor when plugin has no destroy', () => {
    registerPlugin('simple-plugin', () => { return 'not-an-object'; });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const editor = new Yazman(container);

    expect(() => {
      editor.destroy();
      container.remove();
    }).to.not.throw();
  });

  it('should not crash when plugin returns null', () => {
    registerPlugin('null-plugin', () => { return null; });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const editor = new Yazman(container);

    expect(() => {
      editor.destroy();
      container.remove();
    }).to.not.throw();
  });

  it('should continue destroying other plugins when one destroy throws', () => {
    let secondDestroyed = false;
    registerPlugin('bad-destroy', () => {
      return { destroy () { throw new Error('destroy failed'); } };
    });
    registerPlugin('good-destroy', () => {
      return { destroy () { secondDestroyed = true; } };
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const editor = new Yazman(container, { onError: () => {} });

    editor.destroy();
    container.remove();
    expect(secondDestroyed).to.be.true;
  });

  it('should store plugin instances in _pluginInstances', () => {
    const instance = { destroy () {} };
    registerPlugin('inst-plugin', () => instance);

    const container = document.createElement('div');
    document.body.appendChild(container);
    const editor = new Yazman(container);

    expect(editor._pluginInstances).to.be.an('array');
    const found = editor._pluginInstances.find(p => p.name === 'inst-plugin');
    expect(found).to.exist;
    expect(found.instance).to.equal(instance);

    destroyEditor({ editor, container });
  });

  it('should clear _pluginInstances after destroy', () => {
    registerPlugin('cleanup-plugin', () => ({ destroy () {} }));

    const container = document.createElement('div');
    document.body.appendChild(container);
    const editor = new Yazman(container);

    editor.destroy();
    container.remove();
    expect(editor._pluginInstances).to.have.length(0);
  });
});
