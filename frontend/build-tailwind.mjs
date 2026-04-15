import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '@tailwindcss/node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sourceCssPath = path.join(__dirname, 'src', 'index.css');
const outputCssPath = path.join(__dirname, 'src', 'generated.css');
const scanRoots = [
  path.join(__dirname, 'index.html'),
  path.join(__dirname, 'src'),
];
const candidatePattern = /^[A-Za-z0-9_:/.[\]%#(),|-]+$/;

const shouldScanFile = (filePath) => /\.(html|js|jsx)$/.test(filePath);

const collectFiles = async (targetPath) => {
  const stats = await fs.stat(targetPath);
  if (stats.isFile()) {
    return shouldScanFile(targetPath) ? [targetPath] : [];
  }

  const entries = await fs.readdir(targetPath, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const resolved = path.join(targetPath, entry.name);
    return entry.isDirectory() ? collectFiles(resolved) : (shouldScanFile(resolved) ? [resolved] : []);
  }));

  return files.flat();
};

const collectCandidates = async () => {
  const files = (await Promise.all(scanRoots.map((target) => collectFiles(target)))).flat();
  const candidates = new Set();

  for (const file of files) {
    const contents = await fs.readFile(file, 'utf8');

    for (const match of contents.matchAll(/[`"']([^`"']+)[`"']/g)) {
      for (const token of match[1].split(/\s+/)) {
        const candidate = token.trim();

        if (
          candidate &&
          !candidate.includes('${') &&
          !candidate.startsWith('http') &&
          candidatePattern.test(candidate)
        ) {
          candidates.add(candidate);
        }
      }
    }
  }

  return [...candidates];
};

const buildCss = async () => {
  const sourceCss = await fs.readFile(sourceCssPath, 'utf8');
  const compiler = await compile(sourceCss, {
    base: __dirname,
    onDependency() {},
  });
  const candidates = await collectCandidates();
  const compiledCss = compiler.build(candidates);
  await fs.writeFile(outputCssPath, compiledCss, 'utf8');
  console.log(`Generated ${path.relative(__dirname, outputCssPath)} with ${candidates.length} candidates.`);
};

buildCss().catch((error) => {
  console.error('Failed to build Tailwind CSS:', error);
  process.exit(1);
});
