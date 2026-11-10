// Compiles tailwind.css for the static site using the Tailwind v4 core API.
// Usage: NODE_PATH=<dir containing tailwindcss> node tools/build-tailwind.mjs
// (Or simply use the official CLI: npx @tailwindcss/cli -i tools/tailwind.input.css -o tailwind.css --minify)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const require = createRequire(import.meta.url);
const twDir = path.dirname(require.resolve('tailwindcss/package.json'));
const { compile } = await import(path.join(twDir, 'dist/lib.mjs'));

const input = fs.readFileSync(path.join(root, 'tools/tailwind.input.css'), 'utf8');

const loadStylesheet = async (id, base) => {
  let file;
  if (id === 'tailwindcss') file = path.join(twDir, 'index.css');
  else if (id.startsWith('tailwindcss/')) file = path.join(twDir, id.slice('tailwindcss/'.length));
  else file = path.resolve(base, id);
  if (!file.endsWith('.css')) file += '.css';
  return { path: file, base: path.dirname(file), content: fs.readFileSync(file, 'utf8') };
};

const compiler = await compile(input, { base: root, loadStylesheet });

// Candidate scan: every token in the HTML/JS sources (unknown tokens are ignored)
const sources = ['index.html', 'contact.html', 'script.js', 'hero-showcase.js'];
const candidates = new Set();
for (const f of sources) {
  const text = fs.readFileSync(path.join(root, f), 'utf8');
  for (const t of text.split(/[\s"'`<>=]+/)) if (t && t.length < 120) candidates.add(t);
}

const css = compiler.build([...candidates]);
fs.writeFileSync(path.join(root, 'tailwind.css'), css);
console.log(`tailwind.css written: ${(css.length / 1024).toFixed(1)} KB from ${candidates.size} candidates`);
