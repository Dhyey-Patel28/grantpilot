import fs from 'fs';
import path from 'path';

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
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `"use client";\nimport { ${component} } from "../../pages/${component}";\n\nexport default function Page() {\n  return <${component} />;\n}\n`);
});

const apiDir = './src/app/api/profile-project';
fs.mkdirSync(apiDir, { recursive: true });
fs.writeFileSync(path.join(apiDir, 'route.ts'), `import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Received project intake:", body);
    
    // Check if we should use mock
    const useMock = process.env.USE_MOCK_ORCHESTRATE === 'true';
    
    if (useMock) {
      return NextResponse.json({
        community_name: "Clare County",
        applicant_type: "County governments",
        county: "Clare County",
        population: 31400,
        project_category: "transportation",
        project_stage: "construction",
        description: "Clare County has about 31,400 residents and faces a broken bridge and broken pipes that are causing flooding, excessive commute times, and water running through residents' yards. The county wants funding to repair the bridge and fix the broken pipes.",
        estimated_cost: 100000,
        match_available: false,
        documents_available: [
          "resident survey responses",
          "pictures of flooding and broken bridge",
          "township meeting notes"
        ],
        impact_keywords: [
          "bridge repair",
          "flooding",
          "broken pipes",
          "transportation",
          "water infrastructure",
          "commute"
        ]
      });
    }

    // Call WatsonX Orchestrate here in the future
    return NextResponse.json({ message: "WatsonX integration coming soon" });
    
  } catch (error) {
    return NextResponse.json({ error: "Failed to process project profile" }, { status: 500 });
  }
}
`);
