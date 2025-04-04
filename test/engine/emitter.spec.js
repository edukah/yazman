import { expect, createEditor, destroyEditor } from '../helpers.js';

describe('Event Emitter', () => {
  let ctx;

  beforeEach(() => {
    ctx = createEditor();
  });

  afterEach(() => {
    destroyEditor(ctx);
  });

  it('should call handler on emit', () => {
    let called = false;
    ctx.editor.on('test-event', () => { called = true; });
    ctx.editor.emit('test-event');
    expect(called).to.be.true;
  });

  it('should remove handler with off', () => {
    let count = 0;
    const handler = () => { count++; };
    ctx.editor.on('test-event', handler);
    ctx.editor.emit('test-event');
    ctx.editor.off('test-event', handler);
    ctx.editor.emit('test-event');
    expect(count).to.equal(1);
  });

  it('should remove all handlers for event when off called without handler', () => {
    let count = 0;
    ctx.editor.on('test-event', () => { count++; });
    ctx.editor.on('test-event', () => { count++; });
    ctx.editor.off('test-event');
    ctx.editor.emit('test-event');
    expect(count).to.equal(0);
  });

  it('should call multiple handlers in order', () => {
    const order = [];
    ctx.editor.on('test-event', () => order.push(1));
    ctx.editor.on('test-event', () => order.push(2));
    ctx.editor.on('test-event', () => order.push(3));
    ctx.editor.emit('test-event');
    expect(order).to.deep.equal([1, 2, 3]);
  });

  it('should pass arguments to handlers', () => {
    let received;
    ctx.editor.on('test-event', (a, b) => { received = { a, b }; });
    ctx.editor.emit('test-event', 'hello', 42);
    expect(received).to.deep.equal({ a: 'hello', b: 42 });
  });

  it('should handle multiple arguments including objects', () => {
    let received;
    const obj = { start: 0, end: 5 };
    ctx.editor.on('test-event', (data) => { received = data; });
    ctx.editor.emit('test-event', obj);
    expect(received).to.equal(obj);
  });

  it('should not throw when emitting non-existent event', () => {
    expect(() => ctx.editor.emit('nonexistent')).to.not.throw();
  });

  it('should catch handler errors via handleError', () => {
    let errorCaught = false;
    ctx.editor.onError = () => { errorCaught = true; };
    ctx.editor.on('test-event', () => { throw new Error('handler error'); });
    ctx.editor.emit('test-event');
    expect(errorCaught).to.be.true;
  });

  it('should pass correct context to handleError on handler error', () => {
    let receivedContext;
    ctx.editor.onError = (error, context) => { receivedContext = context; };
    ctx.editor.on('my-event', () => { throw new Error('fail'); });
    ctx.editor.emit('my-event');
    expect(receivedContext).to.deep.equal({ module: 'emitter', operation: 'my-event' });
  });

  it('should not affect other handlers when one throws', () => {
    let secondCalled = false;
    ctx.editor.onError = () => {};
    ctx.editor.on('test-event', () => { throw new Error('fail'); });
    ctx.editor.on('test-event', () => { secondCalled = true; });
    ctx.editor.emit('test-event');
    expect(secondCalled).to.be.true;
  });

  it('should return editor instance from on/off for chaining', () => {
    const result = ctx.editor.on('test', () => {});
    expect(result).to.equal(ctx.editor);
    const result2 = ctx.editor.off('test');
    expect(result2).to.equal(ctx.editor);
  });

  it('should not throw on off for non-existent event', () => {
    expect(() => ctx.editor.off('never-registered')).to.not.throw();
  });

  it('should keep separate handler lists for different events', () => {
    let aCalled = false;
    let bCalled = false;
    ctx.editor.on('event-a', () => { aCalled = true; });
    ctx.editor.on('event-b', () => { bCalled = true; });
    ctx.editor.emit('event-a');
    expect(aCalled).to.be.true;
    expect(bCalled).to.be.false;
  });
});
