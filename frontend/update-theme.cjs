const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace colors with semantic variables
  content = content.replace(/bg-background/g, 'bg-bgApp');
  content = content.replace(/bg-surfaceLight/g, 'bg-bgPanelLight');
  content = content.replace(/bg-surface/g, 'bg-bgPanel');
  
  content = content.replace(/text-white/g, 'text-textPrimary');
  content = content.replace(/text-gray-100/g, 'text-textPrimary');
  content = content.replace(/text-gray-200/g, 'text-textPrimary');
  content = content.replace(/text-gray-300/g, 'text-textPrimary');
  
  content = content.replace(/text-gray-400/g, 'text-textSecondary');
  content = content.replace(/text-gray-500/g, 'text-textSecondary');
  
  content = content.replace(/border-white\/5/g, 'border-borderColor');
  content = content.replace(/border-white\/10/g, 'border-borderColor');
  content = content.replace(/border-white\/20/g, 'border-borderColor');
  
  // Replace hover states
  content = content.replace(/hover:text-white/g, 'hover:text-textPrimary');
  content = content.replace(/hover:bg-white\/5/g, 'hover:bg-black/5 dark:hover:bg-white/5');
  content = content.replace(/bg-white\/5/g, 'bg-black/5 dark:bg-white/5');
  content = content.replace(/bg-white\/10/g, 'bg-black/10 dark:bg-white/10');
  
  fs.writeFileSync(file, content);
});

console.log('Done replacing classes in TSX files');
