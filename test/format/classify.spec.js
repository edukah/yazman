import { expect, createEditor, destroyEditor } from '../helpers.js';

describe('Format Classification Maps', () => {
  let ctx;

  before(() => {
    ctx = createEditor();
  });

  after(() => {
    destroyEditor(ctx);
  });

  describe('BLOCK_LEVEL_ELEMENT', () => {
    it('should contain paragraph', () => {
      expect(ctx.editor.BLOCK_LEVEL_ELEMENT.has('paragraph')).to.be.true;
    });

    it('should contain headerTwo', () => {
      expect(ctx.editor.BLOCK_LEVEL_ELEMENT.has('headerTwo')).to.be.true;
    });

    it('should contain headerThree', () => {
      expect(ctx.editor.BLOCK_LEVEL_ELEMENT.has('headerThree')).to.be.true;
    });

    it('should contain preformatted', () => {
      expect(ctx.editor.BLOCK_LEVEL_ELEMENT.has('preformatted')).to.be.true;
    });

    it('should contain blockquote', () => {
      expect(ctx.editor.BLOCK_LEVEL_ELEMENT.has('blockquote')).to.be.true;
    });

    it('should contain listItem', () => {
      expect(ctx.editor.BLOCK_LEVEL_ELEMENT.has('listItem')).to.be.true;
    });

    it('should map format names to their class constructors', () => {
      const ParagraphClass = ctx.editor.BLOCK_LEVEL_ELEMENT.get('paragraph');
      expect(ParagraphClass).to.be.a('function');
      expect(ParagraphClass.tagName).to.equal('P');
    });
  });

  describe('INLINE_ELEMENT', () => {
    it('should contain bold', () => {
      expect(ctx.editor.INLINE_ELEMENT.has('bold')).to.be.true;
    });

    it('should contain italic', () => {
      expect(ctx.editor.INLINE_ELEMENT.has('italic')).to.be.true;
    });

    it('should contain hyperlink', () => {
      expect(ctx.editor.INLINE_ELEMENT.has('hyperlink')).to.be.true;
    });

    it('should contain subscript', () => {
      expect(ctx.editor.INLINE_ELEMENT.has('subscript')).to.be.true;
    });

    it('should contain supscript', () => {
      expect(ctx.editor.INLINE_ELEMENT.has('supscript')).to.be.true;
    });

    it('should contain cursor', () => {
      expect(ctx.editor.INLINE_ELEMENT.has('cursor')).to.be.true;
    });

    it('should not contain block-level formats', () => {
      expect(ctx.editor.INLINE_ELEMENT.has('paragraph')).to.be.false;
      expect(ctx.editor.INLINE_ELEMENT.has('headerTwo')).to.be.false;
    });

    it('should map format names to their class constructors', () => {
      const BoldClass = ctx.editor.INLINE_ELEMENT.get('bold');
      expect(BoldClass).to.be.a('function');
      expect(BoldClass.tagName).to.equal('STRONG');
    });
  });

  describe('CONTAINER_LEVEL_ELEMENT', () => {
    it('should contain orderedList', () => {
      expect(ctx.editor.CONTAINER_LEVEL_ELEMENT.has('orderedList')).to.be.true;
    });

    it('should contain unorderedList', () => {
      expect(ctx.editor.CONTAINER_LEVEL_ELEMENT.has('unorderedList')).to.be.true;
    });

    it('should contain figure', () => {
      expect(ctx.editor.CONTAINER_LEVEL_ELEMENT.has('figure')).to.be.true;
    });

    it('should not contain inline formats', () => {
      expect(ctx.editor.CONTAINER_LEVEL_ELEMENT.has('bold')).to.be.false;
    });

    it('should not contain block formats', () => {
      expect(ctx.editor.CONTAINER_LEVEL_ELEMENT.has('paragraph')).to.be.false;
    });
  });

  describe('EMBED_ELEMENT', () => {
    it('should contain figureImage', () => {
      expect(ctx.editor.EMBED_ELEMENT.has('figureImage')).to.be.true;
    });

    it('should not contain regular block formats', () => {
      expect(ctx.editor.EMBED_ELEMENT.has('paragraph')).to.be.false;
    });

    it('should not contain inline formats', () => {
      expect(ctx.editor.EMBED_ELEMENT.has('bold')).to.be.false;
    });
  });

  describe('mutual exclusivity', () => {
    it('inline formats should not be in BLOCK_LEVEL_ELEMENT', () => {
      ctx.editor.INLINE_ELEMENT.forEach((value, key) => {
        expect(ctx.editor.BLOCK_LEVEL_ELEMENT.has(key), `${key} should not be in BLOCK`).to.be.false;
      });
    });

    it('block formats should not be in INLINE_ELEMENT', () => {
      ctx.editor.BLOCK_LEVEL_ELEMENT.forEach((value, key) => {
        expect(ctx.editor.INLINE_ELEMENT.has(key), `${key} should not be in INLINE`).to.be.false;
      });
    });

    it('container formats should not be in BLOCK or INLINE', () => {
      ctx.editor.CONTAINER_LEVEL_ELEMENT.forEach((value, key) => {
        expect(ctx.editor.BLOCK_LEVEL_ELEMENT.has(key), `${key} should not be in BLOCK`).to.be.false;
        expect(ctx.editor.INLINE_ELEMENT.has(key), `${key} should not be in INLINE`).to.be.false;
      });
    });
  });

  describe('TEXT_NODE', () => {
    it('should be available on editor', () => {
      expect(ctx.editor.TEXT_NODE).to.be.a('function');
    });
  });
});
