import { NextResponse } from 'next/server';

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
    console.error("Failed to process project profile", error);
    return NextResponse.json({ error: "Failed to process project profile" }, { status: 500 });
  }
}
