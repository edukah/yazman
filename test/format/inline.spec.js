import { expect, createEditor, destroyEditor } from '../helpers.js';
import Bold from '../../src/js/format/bold.js';
import Italic from '../../src/js/format/italic.js';
import Hyperlink from '../../src/js/format/hyperlink.js';

describe('Inline Formats', () => {
  let ctx;

  beforeEach(() => {
    ctx = createEditor();
  });

  afterEach(() => {
    destroyEditor(ctx);
  });

  describe('Bold', () => {
    it('should have correct tagName', () => {
      expect(Bold.tagName).to.equal('STRONG');
    });

    it('should have correct formatName', () => {
      expect(Bold.formatName).to.equal('bold');
    });

    it('should create a STRONG element', () => {
      const bold = new Bold(ctx.editor);
      expect(bold.domNode.tagName).to.equal('STRONG');
    });

    it('should set __detail back-reference', () => {
      const bold = new Bold(ctx.editor);
      expect(bold.domNode.__detail).to.equal(bold);
    });

    it('should wrap existing DOM node', () => {
      const existing = document.createElement('strong');
      existing.textContent = 'test';
      const bold = new Bold(ctx.editor, { domNode: existing });
      expect(bold.domNode).to.equal(existing);
      expect(bold.domNode.__detail).to.equal(bold);
    });

    it('should have toolbar SVG', () => {
      expect(Bold.toolbar).to.be.a('string');
      expect(Bold.toolbar).to.include('<svg');
    });
  });

  describe('Italic', () => {
    it('should have correct tagName', () => {
      expect(Italic.tagName).to.equal('EM');
    });

    it('should have correct formatName', () => {
      expect(Italic.formatName).to.equal('italic');
    });

    it('should create an EM element', () => {
      const italic = new Italic(ctx.editor);
      expect(italic.domNode.tagName).to.equal('EM');
    });

    it('should set __detail back-reference', () => {
      const italic = new Italic(ctx.editor);
      expect(italic.domNode.__detail).to.equal(italic);
    });

    it('should wrap existing DOM node', () => {
      const existing = document.createElement('em');
      existing.textContent = 'test';
      const italic = new Italic(ctx.editor, { domNode: existing });
      expect(italic.domNode).to.equal(existing);
    });
  });

  describe('Hyperlink', () => {
    it('should have correct tagName', () => {
      expect(Hyperlink.tagName).to.equal('A');
    });

    it('should have correct formatName', () => {
      expect(Hyperlink.formatName).to.equal('hyperlink');
    });

    it('should create an A element', () => {
      const link = new Hyperlink(ctx.editor);
      expect(link.domNode.tagName).to.equal('A');
    });

    it('should set href attribute', () => {
      const link = new Hyperlink(ctx.editor, { hyperlink: 'https://example.com' });
      expect(link.domNode.getAttribute('href')).to.equal('https://example.com');
    });

    it('should throw when href not provided', () => {
      expect(() => new Hyperlink(ctx.editor)).to.throw(Error);
    });

    it('should read href from existing DOM node', () => {
      const existing = document.createElement('a');
      existing.setAttribute('href', 'https://read-from-dom.com');
      const link = new Hyperlink(ctx.editor, { domNode: existing });
      expect(link.domNode.getAttribute('href')).to.equal('https://read-from-dom.com');
    });

    it('should have static getFormat that returns hyperlink with href', () => {
      const el = document.createElement('a');
      el.setAttribute('href', 'https://test.com');
      const format = Hyperlink.getFormat(el);
      expect(format).to.have.property('hyperlink', 'https://test.com');
    });

    it('should validate URLs via static urlValidate', () => {
      expect(Hyperlink.urlValidate('https://example.com')).to.be.true;
      expect(Hyperlink.urlValidate('http://www.test.org/path')).to.be.true;
      expect(Hyperlink.urlValidate('not a url')).to.be.false;
      expect(Hyperlink.urlValidate('')).to.be.false;
    });
  });

  describe('Inline optimize (merge adjacent)', () => {
    it('should merge adjacent same-type inline elements', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p><strong>Hello</strong><strong> World</strong></p>';
      ctx.editor.update();

      // After optimize, the two strong elements should merge
      const strongs = ctx.editor.root.querySelectorAll('strong');
      expect(strongs.length).to.equal(1);
      expect(strongs[0].textContent).to.equal('Hello World');
    });

    it('should not merge different inline types', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p><strong>Bold</strong><em>Italic</em></p>';
      ctx.editor.update();

      const strongs = ctx.editor.root.querySelectorAll('strong');
      const ems = ctx.editor.root.querySelectorAll('em');
      expect(strongs.length).to.equal(1);
      expect(ems.length).to.equal(1);
    });
  });
});
