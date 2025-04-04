class Registry {
  constructor () {
    this.data = new Map();
  }

  set (key, value) {
    this.data.set(key, value);
  }

  get (key) {
    return this.data.get(key);
  }

  delete (key) {
    return this.data.delete(key);
  }

  has (key) {
    return this.data.has(key);
  }

  map () {
    return this.data;
  }
}

export default Registry;
