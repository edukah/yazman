import { expect } from '@esm-bundle/chai';
import Registry from '../../src/js/engine/registry.js';

describe('Registry', () => {
  let registry;

  beforeEach(() => {
    registry = new Registry();
  });

  it('should set and get a value', () => {
    registry.set('format/bold', 'BoldClass');
    expect(registry.get('format/bold')).to.equal('BoldClass');
  });

  it('should return undefined for non-existent key', () => {
    expect(registry.get('format/nonexistent')).to.be.undefined;
  });

  it('should report has correctly', () => {
    registry.set('format/italic', 'ItalicClass');
    expect(registry.has('format/italic')).to.be.true;
    expect(registry.has('format/nonexistent')).to.be.false;
  });

  it('should delete a key', () => {
    registry.set('format/bold', 'BoldClass');
    registry.delete('format/bold');
    expect(registry.has('format/bold')).to.be.false;
    expect(registry.get('format/bold')).to.be.undefined;
  });

  it('should overwrite existing key', () => {
    registry.set('format/bold', 'OldClass');
    registry.set('format/bold', 'NewClass');
    expect(registry.get('format/bold')).to.equal('NewClass');
  });

  it('should return the internal Map via map()', () => {
    registry.set('a', 1);
    registry.set('b', 2);
    const map = registry.map();
    expect(map).to.be.an.instanceOf(Map);
    expect(map.size).to.equal(2);
  });

  it('should iterate all entries via map()', () => {
    registry.set('format/bold', 'Bold');
    registry.set('format/italic', 'Italic');

    const keys = [];
    registry.map().forEach((value, key) => keys.push(key));
    expect(keys).to.include('format/bold');
    expect(keys).to.include('format/italic');
  });

  it('should handle delete on non-existent key without error', () => {
    expect(() => registry.delete('nonexistent')).to.not.throw();
  });
});
