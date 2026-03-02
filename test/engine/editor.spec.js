import { expect, Yazman, createEditor, destroyEditor } from '../helpers.js';

describe('Editor', () => {
  let ctx;

  afterEach(() => {
    if (ctx) {
      destroyEditor(ctx);
      ctx = null;
    }
  });

  describe('constructor', () => {
    it('should create an editor instance with valid container', () => {
      ctx = createEditor();
      expect(ctx.editor).to.be.an.instanceOf(Yazman);
    });

    it('should throw on invalid container', () => {
      expect(() => new Yazman('not-an-element')).to.throw('Yazman: "container" parameter must be a valid DOM element.');
    });

    it('should throw on null container', () => {
      expect(() => new Yazman(null)).to.throw();
    });

    it('should add yazman-container class to container', () => {
      ctx = createEditor();
      expect(ctx.container.classList.contains('yazman-container')).to.be.true;
    });

    it('should create root contenteditable div', () => {
      ctx = createEditor();
      const root = ctx.container.querySelector('.yazman');
      expect(root).to.not.be.null;
      expect(root.getAttribute('contenteditable')).to.equal('true');
    });

    it('should initialize paper', () => {
      ctx = createEditor();
      expect(ctx.editor.paper).to.exist;
      expect(ctx.editor.paper.lines).to.be.an('array');
    });

    it('should initialize toolbar', () => {
      ctx = createEditor();
      const toolbar = ctx.container.querySelector('.yazman-toolbar');
      expect(toolbar).to.not.be.null;
    });

    it('should set __yazman and wysiwyg on container', () => {
      ctx = createEditor();
      expect(ctx.container.__yazman).to.equal(ctx.editor);
      expect(ctx.container.wysiwyg).to.equal(ctx.editor);
    });

    it('should add blank class when container starts empty', () => {
      ctx = createEditor();
      expect(ctx.editor.root.classList.contains('blank')).to.be.true;
    });

    it('should initialize with exampleContent when third param is true', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const editor = new Yazman(container, {}, true);
      expect(editor.paper.lines.length).to.be.greaterThan(1);
      expect(editor.root.textContent.length).to.be.greaterThan(0);
      editor.destroy();
      container.remove();
    });
  });

  describe('static register', () => {
    it('should register format via static method', () => {
      class MockFormat {}
      Yazman.register('format/mockTest', MockFormat);
      // Verify through a new editor's registry
      ctx = createEditor();
      expect(ctx.editor.registry.has('format/mockTest')).to.be.true;
      expect(ctx.editor.registry.get('format/mockTest')).to.equal(MockFormat);
      // Clean up
      ctx.editor.registry.delete('format/mockTest');
    });
  });

  describe('placeholder', () => {
    it('should set data-yazman-placeholder attribute', () => {
      ctx = createEditor({ placeholder: 'Type here...' });
      expect(ctx.editor.root.getAttribute('data-yazman-placeholder')).to.equal('Type here...');
    });

    it('should not set placeholder when not provided', () => {
      ctx = createEditor();
      expect(ctx.editor.root.hasAttribute('data-yazman-placeholder')).to.be.false;
    });

    it('should not set placeholder when value is not string', () => {
      ctx = createEditor({ placeholder: 123 });
      expect(ctx.editor.root.hasAttribute('data-yazman-placeholder')).to.be.false;
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty editor', () => {
      ctx = createEditor();
      expect(ctx.editor.isEmpty(false)).to.be.true;
    });

    it('should return false when editor has content', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p>Hello World</p>';
      ctx.editor.update();
      expect(ctx.editor.isEmpty(false)).to.be.false;
    });

    it('should set error styling when insertWarning is true and editor is empty', () => {
      ctx = createEditor();
      ctx.editor.isEmpty(true);
      expect(ctx.editor.root.hasAttribute('data-on-error')).to.be.true;
      expect(ctx.editor.root.style.borderColor).to.equal('red');
    });
  });

  describe('getContent / setContent', () => {
    it('should export content as array', () => {
      ctx = createEditor();
      const content = ctx.editor.getContent();
      expect(content).to.be.an('array');
    });

    it('should round-trip content via set/get', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p>Test content</p>';
      ctx.editor.update();
      const exported = ctx.editor.getContent();

      const ctx2 = createEditor();
      ctx2.editor.setContent(exported);
      const reExported = ctx2.editor.getContent();

      expect(reExported.length).to.equal(exported.length);
      destroyEditor(ctx2);
    });

    it('should export content with format and children', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p>Hello</p>';
      ctx.editor.update();
      const exported = ctx.editor.getContent();
      expect(exported[0]).to.have.property('format');
      expect(exported[0]).to.have.property('children').that.is.an('array');
    });
  });

  describe('getText', () => {
    it('should return plain text content', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p>Hello World</p>';
      ctx.editor.update();
      expect(ctx.editor.getText()).to.include('Hello World');
    });

    it('should strip HTML tags', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p>Hello <strong>Bold</strong> World</p>';
      ctx.editor.update();
      const text = ctx.editor.getText();
      expect(text).to.include('Hello');
      expect(text).to.include('Bold');
      expect(text).to.not.include('<strong>');
    });
  });

  describe('getLength', () => {
    it('should return 0 for empty editor', () => {
      ctx = createEditor();
      expect(ctx.editor.getLength()).to.equal(0);
    });

    it('should return correct character count', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p>Hello</p>';
      ctx.editor.update();
      expect(ctx.editor.getLength()).to.equal(5);
    });

    it('should include newline characters between paragraphs', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p>AB</p><p>CD</p>';
      ctx.editor.update();
      // "AB" (2) + newline (1) + "CD" (2) = 5
      expect(ctx.editor.getLength()).to.equal(5);
    });
  });

  describe('enable / disable', () => {
    it('should disable editing', () => {
      ctx = createEditor();
      ctx.editor.disable();
      expect(ctx.editor.root.getAttribute('contenteditable')).to.equal('false');
    });

    it('should re-enable editing', () => {
      ctx = createEditor();
      ctx.editor.disable();
      ctx.editor.enable();
      expect(ctx.editor.root.getAttribute('contenteditable')).to.equal('true');
    });
  });

  describe('isSaved', () => {
    it('should reflect autosave saved state via getter', () => {
      ctx = createEditor({ autosave: { enable: true, adaptor: () => {} } });
      ctx.editor.autosave.saved = true;
      expect(ctx.editor.isSaved).to.be.true;
    });

    it('should set autosave saved state via setter', () => {
      ctx = createEditor({ autosave: { enable: true, adaptor: () => {} } });
      ctx.editor.isSaved = false;
      expect(ctx.editor.autosave.saved).to.be.false;
    });
  });

  describe('focus / hasFocus', () => {
    it('should focus the editor', () => {
      ctx = createEditor();
      ctx.editor.focus();
      expect(ctx.editor.hasFocus()).to.be.true;
    });

    it('should return false when editor is not focused', () => {
      ctx = createEditor();
      // Create another element and focus it instead
      const other = document.createElement('input');
      document.body.appendChild(other);
      other.focus();
      expect(ctx.editor.hasFocus()).to.be.false;
      other.remove();
    });
  });

  describe('formatFilter', () => {
    it('should separate block and inline formats', () => {
      ctx = createEditor();
      const result = ctx.editor.formatFilter({ paragraph: true, bold: true, italic: true });
      expect(result.blockFormat).to.have.property('paragraph');
      expect(result.inlineFormat).to.have.property('bold');
      expect(result.inlineFormat).to.have.property('italic');
    });

    it('should return empty objects for unknown formats', () => {
      ctx = createEditor();
      const result = ctx.editor.formatFilter({ unknown: true });
      expect(Object.keys(result.blockFormat)).to.have.length(0);
      expect(Object.keys(result.inlineFormat)).to.have.length(0);
    });
  });

  describe('deleteContent', () => {
    it('should delete text within a single paragraph', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p>Hello World</p>';
      ctx.editor.update();
      const lengthBefore = ctx.editor.getLength();
      ctx.editor.deleteContent(0, 5);
      expect(ctx.editor.getLength()).to.be.lessThan(lengthBefore);
    });

    it('should be a no-op when start equals end', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p>Hello</p>';
      ctx.editor.update();
      const lengthBefore = ctx.editor.getLength();
      ctx.editor.deleteContent(2, 2);
      expect(ctx.editor.getLength()).to.equal(lengthBefore);
    });
  });

  describe('destroy', () => {
    it('should remove editor DOM from container', () => {
      ctx = createEditor();
      const container = ctx.container;
      ctx.editor.destroy();
      expect(container.querySelector('.yazman')).to.be.null;
      expect(container.querySelector('.yazman-toolbar')).to.be.null;
      expect(container.classList.contains('yazman-container')).to.be.false;
      ctx = null;
    });

    it('should clean up __yazman and wysiwyg references', () => {
      ctx = createEditor();
      const container = ctx.container;
      ctx.editor.destroy();
      expect(container.__yazman).to.be.undefined;
      expect(container.wysiwyg).to.be.undefined;
      ctx = null;
    });

    it('should clear variables and events maps', () => {
      ctx = createEditor();
      ctx.editor.on('test', () => {});
      ctx.editor.variables.set('someKey', 'someValue');
      ctx.editor.destroy();
      expect(ctx.editor.variables.size).to.equal(0);
      expect(ctx.editor._events.size).to.equal(0);
      ctx.container.remove();
      ctx = null;
    });
  });
});
