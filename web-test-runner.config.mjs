import fs from 'fs';
import path from 'path';

function jsonPlugin () {
  return {
    name: 'json-plugin',
    resolveMimeType (context) {
      if (context.path.endsWith('.json')) {
        return 'js';
      }
    },
    async transform (context) {
      if (context.path.endsWith('.json')) {
        const filePath = path.join(process.cwd(), context.path);
        const json = fs.readFileSync(filePath, 'utf-8');
        return { body: `export default ${json};` };
      }
    }
  };
}

export default {
  files: 'test/**/*.spec.js',
  nodeResolve: true,
  plugins: [jsonPlugin()]
};
