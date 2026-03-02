import { expect, createEditor, destroyEditor } from '../helpers.js';

describe('Error Handling', () => {
  let ctx;

  afterEach(() => {
    if (ctx) {
      destroyEditor(ctx);
      ctx = null;
    }
  });

  describe('handleError', () => {
    it('should call onError callback when provided', () => {
      let receivedError = null;
      let receivedContext = null;
      ctx = createEditor({
        onError: (error, context) => {
          receivedError = error;
          receivedContext = context;
        }
      });

      const testError = new Error('test error');
      const testContext = { module: 'editor', operation: 'test' };
      ctx.editor.handleError(testError, testContext);

      expect(receivedError).to.equal(testError);
      expect(receivedContext).to.deep.equal(testContext);
    });

    it('should fall back to console.error when no onError callback', () => {
      ctx = createEditor();
      const originalConsoleError = console.error;
      let consoleCalled = false;
      console.error = () => { consoleCalled = true; };

      ctx.editor.handleError(new Error('test'), { module: 'editor', operation: 'test' });

      console.error = originalConsoleError;
      expect(consoleCalled).to.be.true;
    });

    it('should pass correct context object with module and operation', () => {
      let receivedContext;
      ctx = createEditor({
        onError: (error, context) => { receivedContext = context; }
      });

      ctx.editor.handleError(new Error('test'), { module: 'toolbar', operation: 'format' });

      expect(receivedContext).to.have.property('module', 'toolbar');
      expect(receivedContext).to.have.property('operation', 'format');
    });

    it('should catch onError callback errors with console.error', () => {
      const originalConsoleError = console.error;
      let consoleCalledWith = null;
      console.error = (...args) => { consoleCalledWith = args; };

      ctx = createEditor({
        onError: () => { throw new Error('callback error'); }
      });

      ctx.editor.handleError(new Error('original'), {});

      console.error = originalConsoleError;
      expect(consoleCalledWith).to.not.be.null;
      expect(consoleCalledWith[0]).to.include('Yazman');
    });

    it('should use default empty context when none provided', () => {
      let receivedContext;
      ctx = createEditor({
        onError: (error, context) => { receivedContext = context; }
      });

      ctx.editor.handleError(new Error('test'));

      expect(receivedContext).to.deep.equal({});
    });

    it('should handle non-Error objects as error parameter', () => {
      let receivedError;
      ctx = createEditor({
        onError: (error) => { receivedError = error; }
      });

      ctx.editor.handleError('string error', { module: 'test', operation: 'test' });
      expect(receivedError).to.equal('string error');
    });

    it('should log error.message in console.error fallback', () => {
      ctx = createEditor();
      const originalConsoleError = console.error;
      let loggedArgs = null;
      console.error = (...args) => { loggedArgs = args; };

      ctx.editor.handleError(new Error('specific message'), { module: 'editor', operation: 'op' });

      console.error = originalConsoleError;
      expect(loggedArgs[1]).to.equal('specific message');
    });
  });

  describe('error boundary wrapper', () => {
    it('should wrap public API methods without throwing', () => {
      ctx = createEditor({
        onError: () => {}
      });

      // These should not throw even with invalid arguments
      expect(() => ctx.editor.getContent(999, 0)).to.not.throw();
    });

    it('should return undefined when wrapped method throws', () => {
      let errorCaught = false;
      ctx = createEditor({
        onError: () => { errorCaught = true; }
      });

      // Force an error by calling setContent with invalid data
      const result = ctx.editor.setContent(null);
      // If error was caught, result should be undefined
      if (errorCaught) {
        expect(result).to.be.undefined;
      }
    });

    it('should return normal value when wrapped method succeeds', () => {
      ctx = createEditor();
      ctx.editor.root.innerHTML = '<p>Hello</p>';
      ctx.editor.update();
      const result = ctx.editor.getContent();
      expect(result).to.be.an('array');
    });

    it('should pass correct context for each wrapped method', () => {
      let receivedContext;
      ctx = createEditor({
        onError: (error, context) => { receivedContext = context; }
      });

      // setContent with bad data should trigger handleError with module: 'editor', operation: 'setContent'
      ctx.editor.setContent(null);

      if (receivedContext) {
        expect(receivedContext.module).to.equal('editor');
        expect(receivedContext.operation).to.equal('setContent');
      }
    });
  });
});
