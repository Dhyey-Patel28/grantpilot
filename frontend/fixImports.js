import fs from 'fs';
import path from 'path';

function fixPath(filePath, targetComponent) {
  const depth = filePath.split(path.sep).length - 3; // 'src/app/page.tsx' depth is 3. src/app/ = 2
  // Wait, let's just use absolute-ish paths or calculate relative.
  // Assuming we are in some subdirectory of src/app.
  // we want to get to src/pages.
  
  const absoluteDir = path.dirname(path.resolve(filePath));
  const pagesDir = path.resolve('./src/pages');
  let relativePath = path.relative(absoluteDir, pagesDir);
  relativePath = relativePath.replace(/\\/g, '/');
  
  const content = `"use client";\nimport { ${targetComponent} } from "${relativePath}/${targetComponent}";\n\nexport default function Page() {\n  return <${targetComponent} />;\n}\n`;
  fs.writeFileSync(filePath, content);
}

const routes = {
  'page.tsx': 'Dashboard',
  'explorer/page.tsx': 'GrantExplorer',
  'explorer/[id]/page.tsx': 'GrantDetail',
  'translator/page.tsx': 'Translator',
  'assistant/page.tsx': 'AIAssistant',
  'packet/page.tsx': 'ReadinessPacket',
  'agents/page.tsx': 'Agents',
  'analytics/page.tsx': 'Analytics',
  'documents/page.tsx': 'Documents',
  'settings/page.tsx': 'Settings'
};

Object.entries(routes).forEach(([routePath, component]) => {
  const fullPath = path.join('./src/app', routePath);
  fixPath(fullPath, component);
});

// For intake which was manually created:
fixPath('./src/app/intake/page.tsx', 'IntakeWorkflow');
