import { expect, createEditor, destroyEditor } from '../helpers.js';

describe('History', () => {
  let ctx;

  afterEach(() => {
    if (ctx) {
      destroyEditor(ctx);
      ctx = null;
    }
  });

  describe('initialization', () => {
    it('should have active content after constructor save', () => {
      ctx = createEditor();
      expect(ctx.editor.history.data.active).to.not.be.null;
      expect(ctx.editor.history.data.active).to.have.property('content');
      expect(ctx.editor.history.data.active).to.have.property('caretPos');
    });

    it('should have empty reverse and forward arrays', () => {
      ctx = createEditor();
      expect(ctx.editor.history.data.reverse).to.be.an('array').that.is.empty;
      expect(ctx.editor.history.data.forward).to.be.an('array').that.is.empty;
    });

    it('should have default counterTiming of 2000', () => {
      ctx = createEditor();
      expect(ctx.editor.history.counterTiming).to.equal(2000);
    });

    it('should have default saveCoefficient of 6', () => {
      ctx = createEditor();
      expect(ctx.editor.history.saveCoefficient).to.equal(6);
    });
  });

  describe('config override', () => {
    it('should accept custom counterTiming', () => {
      ctx = createEditor({ history: { counterTiming: 5000 } });
      expect(ctx.editor.history.counterTiming).to.equal(5000);
    });

    it('should accept custom saveCoefficient', () => {
      ctx = createEditor({ history: { saveCoefficient: 10 } });
      expect(ctx.editor.history.saveCoefficient).to.equal(10);
    });
  });

  describe('save / record', () => {
    it('should push to reverse on record', () => {
      ctx = createEditor();
      ctx.editor.variables.set('historyCounter', 1);
      ctx.editor.history.record();
      expect(ctx.editor.history.data.reverse.length).to.equal(1);
    });

    it('should not record when counter is 0', () => {
      ctx = createEditor();
      ctx.editor.variables.set('historyCounter', 0);
      const reverseBefore = ctx.editor.history.data.reverse.length;
      ctx.editor.history.record();
      expect(ctx.editor.history.data.reverse.length).to.equal(reverseBefore);
    });

    it('should reset counter to 0 after record', () => {
      ctx = createEditor();
      ctx.editor.variables.set('historyCounter', 5);
      ctx.editor.history.record();
      expect(ctx.editor.variables.get('historyCounter')).to.equal(0);
    });

    it('should auto-record when counter exceeds saveCoefficient', () => {
      ctx = createEditor({ history: { saveCoefficient: 2 } });
      const reverseBefore = ctx.editor.history.data.reverse.length;

      // save() increments counter each time and records when > saveCoefficient
      ctx.editor.history.save();
      ctx.editor.history.save();
      ctx.editor.history.save();
      ctx.editor.history.save();

      expect(ctx.editor.history.data.reverse.length).to.be.greaterThan(reverseBefore);
    });

    it('should auto-record after counterTiming timeout', (done) => {
      ctx = createEditor({ history: { counterTiming: 50, saveCoefficient: 9999 } });
      const reverseBefore = ctx.editor.history.data.reverse.length;

      ctx.editor.history.save();

      setTimeout(() => {
        expect(ctx.editor.history.data.reverse.length).to.be.greaterThan(reverseBefore);
        done();
      }, 100);
    });

    it('should update active content on record', () => {
      ctx = createEditor();
      const activeBefore = ctx.editor.history.data.active;
      ctx.editor.variables.set('historyCounter', 1);
      ctx.editor.history.record();
      // active should be refreshed (new object)
      expect(ctx.editor.history.data.active).to.not.equal(activeBefore);
    });
  });

  describe('undo', () => {
    it('should pop from reverse and push to forward', () => {
      ctx = createEditor();
      ctx.editor.variables.set('historyCounter', 1);
      ctx.editor.history.record();
      expect(ctx.editor.history.data.reverse.length).to.equal(1);

      const mockEvent = { preventDefault: () => {} };
      ctx.editor.history.undo(mockEvent);
      expect(ctx.editor.history.data.forward.length).to.be.greaterThan(0);
    });

    it('should call event.preventDefault', () => {
      ctx = createEditor();
      ctx.editor.variables.set('historyCounter', 1);
      ctx.editor.history.record();

      let prevented = false;
      ctx.editor.history.undo({ preventDefault: () => { prevented = true; } });
      expect(prevented).to.be.true;
    });

    it('should not throw on undo with empty reverse', () => {
      ctx = createEditor();
      const mockEvent = { preventDefault: () => {} };
      expect(() => ctx.editor.history.undo(mockEvent)).to.not.throw();
    });

    it('should restore previous content on undo', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p>Version 1</p>';
      ctx.editor.update();
      ctx.editor.variables.set('historyCounter', 1);
      ctx.editor.history.record();

      ctx.editor.root.innerHTML = '<p>Version 2</p>';
      ctx.editor.update();
      ctx.editor.variables.set('historyCounter', 1);
      ctx.editor.history.record();

      const mockEvent = { preventDefault: () => {} };
      ctx.editor.history.undo(mockEvent);

      // After undo, content should go back to version 1
      expect(ctx.editor.root.textContent).to.include('Version 1');
    });
  });

  describe('redo', () => {
    it('should pop from forward and push to reverse', () => {
      ctx = createEditor();
      ctx.editor.variables.set('historyCounter', 1);
      ctx.editor.history.record();

      const mockEvent = { preventDefault: () => {} };
      ctx.editor.history.undo(mockEvent);
      const forwardBefore = ctx.editor.history.data.forward.length;

      ctx.editor.history.redo(mockEvent);
      expect(ctx.editor.history.data.forward.length).to.equal(forwardBefore - 1);
    });

    it('should not throw on redo with empty forward', () => {
      ctx = createEditor();
      const mockEvent = { preventDefault: () => {} };
      expect(() => ctx.editor.history.redo(mockEvent)).to.not.throw();
    });

    it('should call event.preventDefault', () => {
      ctx = createEditor();
      let prevented = false;
      ctx.editor.history.redo({ preventDefault: () => { prevented = true; } });
      expect(prevented).to.be.true;
    });
  });
});
