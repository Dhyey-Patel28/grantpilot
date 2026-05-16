# watsonx Orchestrate Agent Plan

Use GrantPilot pipeline functions as tools in watsonx Orchestrate.

## Agent 1 — Discovery Agent
Runs:
- Grants.gov keyword discovery
- MI Funding Hub JS discovery

## Agent 2 — Source Refresh Agent
Refreshes known URLs/opportunity IDs from the source registry.

## Agent 3 — Normalization Agent
Combines raw sources into one grant schema.

## Agent 4 — Fit Scoring Agent
Runs deterministic scoring and asks Granite to explain the score.

## Agent 5 — Requirements Translator Agent
Uses Granite to translate grant text into plain-English eligibility, required docs, match, and blockers.

## Agent 6 — Autofill Agent
Maps project profile fields into common application answers.

## Agent 7 — Trust Guard Agent
Checks:
- Is this real or mock?
- Is there a source URL?
- Is the status open/closed/unknown?
- Are claims unsupported?
- Which fields require human verification?

## Agent 8 — Packet Generator Agent
Creates the final grant-readiness packet.
