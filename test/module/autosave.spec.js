import { expect, createEditor, destroyEditor } from '../helpers.js';
import Autosave from '../../src/js/module/autosave.js';

describe('Autosave', () => {
  let ctx;

  afterEach(() => {
    if (ctx) {
      destroyEditor(ctx);
      ctx = null;
    }
  });

  describe('static defaults', () => {
    it('should have enable = false', () => {
      expect(Autosave.enable).to.equal(false);
    });

    it('should have counterTiming = 36000', () => {
      expect(Autosave.counterTiming).to.equal(36000);
    });

    it('should have saveCoefficient = 40', () => {
      expect(Autosave.saveCoefficient).to.equal(40);
    });

    it('should have preventUnload = false', () => {
      expect(Autosave.preventUnload).to.equal(false);
    });

    it('should have default adaptor as noop function', () => {
      expect(Autosave.adaptor).to.be.a('function');
    });
  });

  describe('disabled mode', () => {
    it('should not create save method hooks when enable is false', () => {
      ctx = createEditor({
        autosave: { enable: false }
      });
      // When disabled, the autosave instance early-returns in constructor
      // so saved/processing/counter are not initialized
      expect(ctx.editor.autosave.enable).to.be.false;
    });

    it('should not call adaptor when enable is false', () => {
      let adaptorCalled = false;
      ctx = createEditor({
        autosave: {
          enable: false,
          adaptor: () => { adaptorCalled = true; }
        }
      });
      expect(adaptorCalled).to.be.false;
    });
  });

  describe('enabled mode', () => {
    it('should accept custom config values', () => {
      ctx = createEditor({
        autosave: {
          enable: true,
          counterTiming: 5000,
          saveCoefficient: 10,
          adaptor: () => {}
        }
      });
      expect(ctx.editor.autosave.counterTiming).to.equal(5000);
      expect(ctx.editor.autosave.saveCoefficient).to.equal(10);
    });

    it('should initialize saved as true', () => {
      ctx = createEditor({
        autosave: { enable: true, adaptor: () => {} }
      });
      expect(ctx.editor.autosave.saved).to.be.true;
    });

    it('should set saved to false on save call', () => {
      ctx = createEditor({
        autosave: {
          enable: true,
          counterTiming: 60000,
          saveCoefficient: 9999,
          adaptor: () => {}
        }
      });
      ctx.editor.autosave.save();
      expect(ctx.editor.autosave.saved).to.be.false;
    });

    it('should call adaptor after saveCoefficient threshold is exceeded', () => {
      let adaptorCalled = false;
      ctx = createEditor({
        autosave: {
          enable: true,
          saveCoefficient: 2,
          counterTiming: 60000,
          adaptor: () => { adaptorCalled = true; }
        }
      });

      ctx.editor.autosave.save();
      ctx.editor.autosave.save();
      ctx.editor.autosave.save();
      ctx.editor.autosave.save();

      expect(adaptorCalled).to.be.true;
    });

    it('should set saved back to true after adaptor is called via coefficient', () => {
      ctx = createEditor({
        autosave: {
          enable: true,
          saveCoefficient: 2,
          counterTiming: 60000,
          adaptor: () => {}
        }
      });

      ctx.editor.autosave.save();
      ctx.editor.autosave.save();
      ctx.editor.autosave.save();
      ctx.editor.autosave.save();

      expect(ctx.editor.autosave.saved).to.be.true;
    });

    it('should call adaptor after counterTiming timeout', (done) => {
      let adaptorCalled = false;
      ctx = createEditor({
        autosave: {
          enable: true,
          counterTiming: 50,
          saveCoefficient: 9999,
          adaptor: () => { adaptorCalled = true; }
        }
      });

      ctx.editor.autosave.save();

      setTimeout(() => {
        expect(adaptorCalled).to.be.true;
        done();
      }, 100);
    });

    it('should reset counter after adaptor is called via timeout', (done) => {
      ctx = createEditor({
        autosave: {
          enable: true,
          counterTiming: 50,
          saveCoefficient: 9999,
          adaptor: () => {}
        }
      });

      ctx.editor.autosave.save();

      setTimeout(() => {
        expect(ctx.editor.variables.get('autosaveCounter')).to.equal(0);
        done();
      }, 100);
    });
  });

  describe('setBlock', () => {
    it('should block save when setBlock(true)', () => {
      let adaptorCalled = false;
      ctx = createEditor({
        autosave: {
          enable: true,
          saveCoefficient: 0,
          adaptor: () => { adaptorCalled = true; }
        }
      });

      ctx.editor.autosave.setBlock(true);
      ctx.editor.autosave.save();
      expect(adaptorCalled).to.be.false;
    });

    it('should unblock save when setBlock(false)', () => {
      let adaptorCallCount = 0;
      ctx = createEditor({
        autosave: {
          enable: true,
          saveCoefficient: 0,
          counterTiming: 60000,
          adaptor: () => { adaptorCallCount++; }
        }
      });

      ctx.editor.autosave.setBlock(true);
      ctx.editor.autosave.save();
      expect(adaptorCallCount).to.equal(0);

      ctx.editor.autosave.setBlock(false);
      // Need enough calls to exceed coefficient (0) threshold
      ctx.editor.autosave.save();
      ctx.editor.autosave.save();
      expect(adaptorCallCount).to.be.greaterThan(0);
    });
  });

  describe('setGlobalUnLoad', () => {
    it('should set global autosavePreventUnload flag', () => {
      ctx = createEditor({
        autosave: { enable: true, adaptor: () => {} }
      });
      ctx.editor.autosave.setGlobalUnLoad(false);
      expect(globalThis.__yazman.autosavePreventUnload).to.be.false;

      ctx.editor.autosave.setGlobalUnLoad(true);
      expect(globalThis.__yazman.autosavePreventUnload).to.be.true;
    });
  });

  describe('isSaved integration', () => {
    it('should reflect saved state through editor.isSaved', () => {
      ctx = createEditor({
        autosave: {
          enable: true,
          counterTiming: 60000,
          saveCoefficient: 9999,
          adaptor: () => {}
        }
      });

      expect(ctx.editor.isSaved).to.be.true;
      ctx.editor.autosave.save();
      expect(ctx.editor.isSaved).to.be.false;
    });
  });
});
