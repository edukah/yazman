import { expect, createEditor, destroyEditor } from '../helpers.js';

describe('Paper', () => {
  let ctx;

  afterEach(() => {
    if (ctx) {
      destroyEditor(ctx);
      ctx = null;
    }
  });

  describe('generate', () => {
    it('should generate lines from DOM', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p>First</p><p>Second</p>';
      ctx.editor.observer.complete();
      ctx.editor.paper.generate();
      expect(ctx.editor.paper.lines.length).to.equal(2);
    });

    it('should produce a single line for empty editor', () => {
      ctx = createEditor();
      expect(ctx.editor.paper.lines.length).to.equal(1);
    });

    it('should add empty p if root has no children', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '';
      ctx.editor.paper.generate();
      expect(ctx.editor.root.children.length).to.equal(1);
      expect(ctx.editor.root.children[0].tagName).to.equal('P');
    });

    it('should regenerate lines array on each call', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p>A</p>';
      ctx.editor.observer.complete();
      ctx.editor.paper.generate();
      expect(ctx.editor.paper.lines.length).to.equal(1);

      ctx.editor.root.innerHTML = '<p>A</p><p>B</p><p>C</p>';
      ctx.editor.observer.complete();
      ctx.editor.paper.generate();
      expect(ctx.editor.paper.lines.length).to.equal(3);
    });

    it('should handle container elements (lists)', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<ol><li>Item 1</li><li>Item 2</li></ol>';
      ctx.editor.observer.complete();
      ctx.editor.paper.generate();
      // List items are the lines, not the container
      expect(ctx.editor.paper.lines.length).to.equal(2);
      expect(ctx.editor.paper.lines[0].domNode.tagName).to.equal('LI');
    });
  });

  describe('getLine', () => {
    it('should return the line at a given index', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p>Hello</p><p>World</p>';
      ctx.editor.observer.complete();
      ctx.editor.paper.generate();

      const line = ctx.editor.paper.getLine(0);
      expect(line).to.exist;
      expect(line.domNode.tagName).to.equal('P');
    });

    it('should return correct line for index in second paragraph', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p>AB</p><p>CD</p>';
      ctx.editor.update();

      // "AB" = 2 chars + 1 newline = index 3 is in second paragraph
      const line = ctx.editor.paper.getLine(3);
      expect(line).to.exist;
      expect(line.domNode.textContent).to.equal('CD');
    });

    it('should return undefined for out-of-bounds index', () => {
      ctx = createEditor();
      const line = ctx.editor.paper.getLine(9999);
      expect(line).to.be.undefined;
    });
  });

  describe('getLines', () => {
    it('should return lines in range', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p>AAAA</p><p>BBBB</p><p>CCCC</p>';
      ctx.editor.observer.complete();
      ctx.editor.paper.generate();

      const allLines = ctx.editor.paper.getLines(0, ctx.editor.paper.getLength());
      expect(allLines.length).to.equal(3);
    });

    it('should return single line when start equals end', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p>Hello</p>';
      ctx.editor.observer.complete();
      ctx.editor.paper.generate();

      const lines = ctx.editor.paper.getLines(0, 0);
      expect(lines.length).to.be.at.most(1);
    });

    it('should return only affected lines in partial range', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p>AAAA</p><p>BBBB</p><p>CCCC</p>';
      ctx.editor.update();

      // First paragraph: 0-4, second: 5-9, third: 10-14
      // Range [0, 5) should only include first paragraph
      const lines = ctx.editor.paper.getLines(0, 4);
      expect(lines.length).to.equal(1);
    });

    it('should default end to total length when not provided', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p>AA</p><p>BB</p>';
      ctx.editor.update();

      const lines = ctx.editor.paper.getLines(0);
      expect(lines.length).to.equal(2);
    });
  });

  describe('getLength', () => {
    it('should return 0 for empty editor', () => {
      ctx = createEditor();
      expect(ctx.editor.paper.getLength()).to.equal(0);
    });

    it('should return correct length for single paragraph', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p>Hello</p>';
      ctx.editor.update();
      expect(ctx.editor.paper.getLength()).to.equal(5);
    });

    it('should include newline between multiple paragraphs', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p>AB</p><p>CD</p>';
      ctx.editor.update();
      // AB(2) + newline(1) + CD(2) = 5
      expect(ctx.editor.paper.getLength()).to.equal(5);
    });

    it('should return 0 when lines array is empty', () => {
      ctx = createEditor();
      ctx.editor.paper.lines = [];
      expect(ctx.editor.paper.getLength()).to.equal(0);
    });
  });

  describe('getNode', () => {
    it('should return a node at given index', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p>Hello</p>';
      ctx.editor.update();

      const node = ctx.editor.paper.getNode(2);
      expect(node).to.exist;
    });

    it('should return null for invalid index beyond content', () => {
      ctx = createEditor();
      const node = ctx.editor.paper.getNode(9999);
      expect(node).to.be.null;
    });
  });

  describe('getNodes', () => {
    it('should return nodes in range', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p>Hello World</p>';
      ctx.editor.update();

      const nodes = ctx.editor.paper.getNodes(0, 5);
      expect(nodes).to.be.an('array');
      expect(nodes.length).to.be.greaterThan(0);
    });

    it('should return single node when start equals end', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p>Hello</p>';
      ctx.editor.update();

      const nodes = ctx.editor.paper.getNodes(2, 2);
      expect(nodes.length).to.be.at.most(1);
    });
  });

  describe('getFormat', () => {
    it('should return format for a range', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p>Hello</p>';
      ctx.editor.update();

      const format = ctx.editor.paper.getFormat(0, 5);
      expect(format).to.have.property('paragraph', true);
    });

    it('should return inline format for formatted text', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p><strong>Bold</strong></p>';
      ctx.editor.update();

      const format = ctx.editor.paper.getFormat(0, 4);
      expect(format).to.have.property('bold', true);
    });
  });

  describe('importContent / exportContent', () => {
    it('should round-trip content', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p>Test paragraph</p>';
      ctx.editor.update();
      const exported = ctx.editor.paper.exportContent();
      expect(exported).to.be.an('array');
      expect(exported.length).to.be.greaterThan(0);

      const ctx2 = createEditor();
      ctx2.editor.paper.importContent(exported);
      const reExported = ctx2.editor.paper.exportContent();
      expect(reExported.length).to.equal(exported.length);
      destroyEditor(ctx2);
    });

    it('should export content with format and children', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p>Hello</p>';
      ctx.editor.update();
      const exported = ctx.editor.paper.exportContent();
      expect(exported[0]).to.have.property('format');
      expect(exported[0]).to.have.property('children').that.is.an('array');
    });

    it('should export children with textContent and format', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p>Hello</p>';
      ctx.editor.update();
      const exported = ctx.editor.paper.exportContent();
      const child = exported[0].children[0];
      expect(child).to.have.property('textContent', 'Hello');
      expect(child).to.have.property('format');
    });

    it('should export partial content with start/end params', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p>Hello World</p>';
      ctx.editor.update();
      const exported = ctx.editor.paper.exportContent(0, 5);
      expect(exported[0].children[0].textContent).to.equal('Hello');
    });

    it('should preserve inline formatting through import/export', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p><strong>Bold text</strong></p>';
      ctx.editor.update();
      const exported = ctx.editor.paper.exportContent();
      expect(exported[0].children[0].format).to.have.property('bold');

      const ctx2 = createEditor();
      ctx2.editor.paper.importContent(exported);
      const reExported = ctx2.editor.paper.exportContent();
      expect(reExported[0].children[0].format).to.have.property('bold');
      destroyEditor(ctx2);
    });
  });
});
