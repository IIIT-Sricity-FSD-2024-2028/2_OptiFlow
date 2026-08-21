const fs = require('fs');
const path = require('path');

const entryPoint = 'a:/iiits/4/FFSD/co/src/routes/index.tsx';
const srcDir = 'a:/iiits/4/FFSD/co/src';
const outputFile = 'a:/iiits/4/FFSD/co/all_code.md';

const visited = new Set();
const output = [];

function resolveImport(importPath, currentDir) {
  if (importPath.startsWith('@/')) {
    importPath = path.join(srcDir, importPath.slice(2));
  } else if (importPath.startsWith('./') || importPath.startsWith('../')) {
    importPath = path.join(currentDir, importPath);
  } else {
    return null; // External package
  }

  // Try extensions
  const extensions = ['.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts'];
  for (const ext of extensions) {
    if (fs.existsSync(importPath + ext)) {
      return importPath + ext;
    }
  }
  if (fs.existsSync(importPath)) {
    return importPath;
  }
  return null;
}

function processFile(filePath) {
  if (visited.has(filePath)) return;
  visited.add(filePath);

  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf-8');
  output.push(`\n\n### File: ${path.relative('a:/iiits/4/FFSD/co', filePath)}\n\`\`\`tsx\n${content}\n\`\`\``);

  // Extract imports
  const importRegex = /import\s+(?:(?:{[^}]+})|(?:[^;]+))\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    const resolvedPath = resolveImport(importPath, path.dirname(filePath));
    if (resolvedPath) {
      processFile(resolvedPath);
    }
  }
}

processFile(entryPoint);

fs.writeFileSync(outputFile, output.join('\n'));
console.log('Done!');
