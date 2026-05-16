import fs from 'fs';
import path from 'path';

const dirs = ['./src/components', './src/pages'];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  if (!content.includes('"use client"') && !content.includes("'use client'")) {
    content = `"use client";\n` + content;
    changed = true;
  }

  if (content.includes('react-router-dom')) {
    // Collect what was imported
    const hasLink = content.includes('Link') && /import.*Link.*react-router-dom/.test(content);
    const hasNavigate = content.includes('useNavigate');
    const hasParams = content.includes('useParams');
    const hasLocation = content.includes('useLocation');

    // Remove the old react-router-dom import
    content = content.replace(/import\s+{([^}]+)}\s+from\s+['"]react-router-dom['"];?\n?/, '');

    // Add Next.js imports
    let nextImports = '';
    if (hasLink) {
      nextImports += `import Link from 'next/link';\n`;
    }
    const navImports = [];
    if (hasNavigate) navImports.push('useRouter');
    if (hasParams) navImports.push('useParams');
    if (hasLocation) navImports.push('usePathname');

    if (navImports.length > 0) {
      nextImports += `import { ${navImports.join(', ')} } from 'next/navigation';\n`;
    }

    // Insert next imports after use client
    content = content.replace(/"use client";\n/, `"use client";\n${nextImports}`);

    // Replace usages
    content = content.replace(/useNavigate\(\)/g, 'useRouter()');
    content = content.replace(/useLocation\(\)/g, '{ pathname: usePathname() }');

    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${filePath}`);
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
