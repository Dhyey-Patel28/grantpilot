import fs from 'fs';
import path from 'path';

const dirs = ['./src/components', './src/pages'];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes('<Link') && content.includes('to=')) {
    content = content.replace(/<Link([^>]+)to=/g, '<Link$1href=');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Fixed Link in ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

dirs.forEach(walkDir);
