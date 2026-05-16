import { cleanText } from "../lib/text.js";

function stripHtml(value) {
  return cleanText(String(value ?? "").replace(/<[^>]*>/g, " "));
}

function norm(value) {
  return stripHtml(value).toLowerCase();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasPhrase(text, phrase) {
  const p = String(phrase || "").toLowerCase().trim();
  if (!p) return false;
  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(p)}([^a-z0-9]|$)`, "i");
  return pattern.test(text);
}

function hasAny(text, terms) {
  return terms.some(term => hasPhrase(text, term));
}

function matchedTerms(text, terms) {
  return terms.filter(term => hasPhrase(text, term));
}

function projectText(project) {
  return norm([
    project.project_category,
    project.project_stage,
    project.description,
    ...(project.impact_keywords || []),
    ...(project.documents_available || [])
  ].join(" "));
}

function grantText(grant) {
  return norm([
    grant.title,
    grant.agency,
    grant.overview,
    ...(grant.categories || []),
    JSON.stringify(grant.raw || {})
  ].join(" "));
}

const CATEGORY_TERMS = {
  water: [
    "water", "drinking water", "wastewater", "sewer", "stormwater", "flood", "flooding",
    "drainage", "pipe", "pipes", "water main", "lead service line", "culvert"
  ],
  transportation: [
    "transportation", "road", "roads", "roadway", "bridge", "bridges", "highway",
    "traffic", "intersection", "sidewalk", "safe streets", "safe routes", "transit",
    "commute", "commuting", "culvert"
  ],
  broadband: [
    "broadband", "internet", "connectivity", "digital equity", "telehealth", "remote work"
  ],
  energy: [
    "energy", "energy efficiency", "solar", "backup power", "microgrid", "hvac",
    "emergency power", "resilience"
  ],
  housing: [
    "housing", "affordable housing", "workforce housing", "rental", "zoning"
  ],
  community_development: [
    "community development", "downtown", "revitalization", "placemaking", "corridor",
    "small business"
  ],
  public_safety: [
    "public safety", "fire", "police", "ems", "emergency", "disaster", "response"
  ],
  agriculture: [
    "agriculture", "farm", "food systems", "conservation district", "rural"
  ],
  workforce: [
    "workforce", "training", "apprenticeship", "career", "jobs", "childcare"
  ],
  environment: [
    "environment", "brownfield", "remediation", "conservation", "climate resilience",
    "shoreline", "erosion"
  ],
  health: [
    "health", "public health", "clinic", "rural health", "patient", "medical"
  ],
  education: [
    "school", "library", "student", "classroom", "digital learning", "education"
  ]
};

const CIVIC_INFRA_CATEGORIES = new Set([
  "water", "transportation", "broadband", "energy", "housing",
  "community_development", "public_safety", "agriculture", "environment"
]);

const RESEARCH_HEALTH_NOISE = [
  "clinical trial", "clinical trials", "cancer", "pregnant", "lactating",
  "biomedical", "nih", "national institutes of health", "nci-designated",
  "investigator-initiated", "observational studies", "research network",
  "clinical research", "genomics", "patients", "medical research",
  "health threats", "outbreak", "surveillance systems", "rural health",
  "health care", "healthcare", "health network", "human services", "patients",
  "hospital", "medical", "clinical", "behavioral health"
];

function projectNeedsPhysicalBridge(project) {
  const pt = projectText(project);
  return hasAny(pt, ["broken bridge", "bridge repair", "bridge", "bridges"]);
}

function projectNeedsWaterFloodFix(project) {
  const pt = projectText(project);
  return hasAny(pt, ["flood", "flooding", "water running", "stormwater", "drainage", "broken pipe", "broken pipes", "pipe", "pipes"]);
}

function looksLikeResearchHealthNoise(project, grant) {
  const cat = cleanText(project.project_category).toLowerCase();
  if (cat === "health") return false;
  const text = grantText(grant);
  const agency = norm(grant.agency);
  if (agency.includes("national institutes of health")) return true;
  return hasAny(text, RESEARCH_HEALTH_NOISE);
}

function looksForeignOrGlobalMismatch(project, grant) {
  const cat = cleanText(project.project_category).toLowerCase();
  if (cat === "health" || cat === "environment") return false;
  const text = grantText(grant);
  return hasAny(text, [
    "global health", "foreign assistance", "international", "worldwide",
    "africa", "asia", "latin america", "caribbean", "developing countries"
  ]);
}


function looksRecreationTrailMismatch(project, grant) {
  const pt = projectText(project);
  const text = grantText(grant);
  if (hasAny(pt, ["snowmobile", "trail", "recreation", "recreational"])) return false;
  return hasAny(text, ["snowmobile", "recreational trail", "trail improvement", "trail grant"]);
}

function looksMappingResearchMismatch(project, grant) {
  const cat = cleanText(project.project_category).toLowerCase();
  if (cat === "environment") return false;

  const text = grantText(grant);
  return hasAny(text, [
    "geologic", "geological", "geologic maps", "geologic mapping", "geological mapping",
    "national cooperative geologic mapping", "u.s. geological survey", "usgs",
    "graduate student", "undergraduate student", "academic programs", "earth science",
    "research facilities", "research-resource facilities", "innovative research",
    "research grants"
  ]);
}

function falseBridgeMeaning(project, grant) {
  if (!projectNeedsPhysicalBridge(project)) return false;
  const text = grantText(grant);
  if (!hasPhrase(text, "bridge")) return false;

  const physicalBridgeTerms = [
    "bridge repair", "bridge replacement", "bridge rehabilitation", "bridge construction",
    "bridge investment", "bridge safety", "bridges", "bridge program", "transportation bridge"
  ];
  if (hasAny(text, physicalBridgeTerms)) return false;

  return hasAny(text, [
    "bridge to", "bridge gaps", "bridge the gap", "bridging", "bridge program for",
    "bridge awards", "career bridge", "research bridge"
  ]);
}

function getProjectTerms(project) {
  const cat = cleanText(project.project_category).toLowerCase();
  const terms = new Set(CATEGORY_TERMS[cat] || []);

  for (const kw of project.impact_keywords || []) {
    const k = norm(kw);
    if (k && k.length > 2) terms.add(k);
  }

  const pt = projectText(project);

  // Add specific extracted terms from the project description.
  const specific = [
    "broken bridge", "bridge repair", "bridge", "broken pipe", "broken pipes", "pipes",
    "flooding", "flood", "drainage", "water running", "commute", "road safety",
    "signage", "shoulder improvements", "intersection", "brown water", "water main",
    "stormwater", "wastewater", "sewer", "broadband", "hvac", "backup power"
  ];
  for (const term of specific) {
    if (hasPhrase(pt, term)) terms.add(term);
  }

  // Remove terms that are too generic to drive matching.
  ["infrastructure", "community", "rural", "resilience", "management"].forEach(t => terms.delete(t));

  return Array.from(terms);
}

function directRelevanceScore(project, grant) {
  const title = norm(grant.title);
  const overview = norm(grant.overview);
  const text = grantText(grant);
  const cat = cleanText(project.project_category).toLowerCase();
  const terms = getProjectTerms(project);

  let score = 0;
  const reasons = [];

  const titleMatches = matchedTerms(title, terms);
  const overviewMatches = matchedTerms(overview, terms);

  if (titleMatches.length) {
    score += Math.min(18, titleMatches.length * 6);
    reasons.push(`title mentions ${titleMatches.slice(0, 4).join(", ")}`);
  }

  if (overviewMatches.length) {
    score += Math.min(14, overviewMatches.length * 3);
    reasons.push(`overview mentions ${overviewMatches.slice(0, 4).join(", ")}`);
  }

  if (cat === "transportation" && hasAny(text, ["transportation", "road", "roads", "bridge", "bridges", "highway", "safe streets"])) {
    score += 8;
    reasons.push("transportation/road/bridge language");
  }

  if (cat === "transportation" && hasAny(text, ["department of transportation", "federal highway administration", "dot-fhwa", "fhwa", "highway planning and construction"])) {
    score += 8;
    reasons.push("transportation agency/program language");
  }

  if (projectNeedsPhysicalBridge(project) && hasAny(title, ["bridge investment program", "bridge project grants", "bridge planning", "bridge grant"])) {
    score += 18;
    reasons.push("title is directly about bridge funding");
  }

  if (cat === "water" && hasAny(text, ["water", "wastewater", "sewer", "stormwater", "drinking water", "flooding", "drainage"])) {
    score += 8;
    reasons.push("water/stormwater language");
  }

  if (projectNeedsPhysicalBridge(project) && hasAny(text, [
    "bridge investment", "bridge repair", "bridge replacement", "bridge rehabilitation",
    "bridges", "bridge construction", "bridge safety"
  ])) {
    score += 14;
    reasons.push("physical bridge funding language");
  }

  if (projectNeedsWaterFloodFix(project) && hasAny(text, [
    "flooding", "flood", "stormwater", "drainage", "wastewater", "sewer", "water infrastructure",
    "water", "pipes", "culvert"
  ])) {
    score += 10;
    reasons.push("flooding/water infrastructure language");
  }

  if (falseBridgeMeaning(project, grant)) {
    score = Math.min(score, 8);
    reasons.push("uses bridge in a non-physical/inapplicable sense");
  }

  if (looksLikeResearchHealthNoise(project, grant)) {
    score = Math.min(score, 6);
    reasons.push("research/clinical-health domain mismatch");
  }

  if (looksForeignOrGlobalMismatch(project, grant)) {
    score = Math.min(score, 8);
    reasons.push("global/foreign program mismatch");
  }

  if (looksRecreationTrailMismatch(project, grant)) {
    score = Math.min(score, 12);
    reasons.push("recreation/snowmobile trail mismatch");
  }

  if (looksMappingResearchMismatch(project, grant)) {
    score = Math.min(score, 10);
    reasons.push("mapping/research program mismatch");
  }

  score = Math.max(0, Math.min(40, score));

  if (!reasons.length) reasons.push("no strong direct title/overview match");
  return [score, reasons.join("; ") + "."];
}

function applicantScore(project, grant, directRelevance) {
  const applicant = cleanText(project.applicant_type).toLowerCase();
  const eligible = (grant.eligible_applicants || []).join(" ").toLowerCase();

  // If the grant itself is irrelevant, eligibility should not rescue it.
  const maxWhenWeak = directRelevance < 10 ? 5 : 12;

  if (!eligible) return [Math.min(6, maxWhenWeak), "Eligible applicants not listed; needs manual review."];
  if (applicant && eligible.includes(applicant)) return [Math.min(12, maxWhenWeak), "Applicant type appears to match."];
  if (["city", "township", "village", "county", "local government"].some(x => eligible.includes(x)) &&
      ["city", "township", "village", "county", "local"].some(x => applicant.includes(x))) {
    return [Math.min(10, maxWhenWeak), "Local government eligibility appears likely."];
  }
  if (eligible.includes("others") && directRelevance >= 25) {
    return [8, "Eligibility is listed as 'Others'; needs manual review but may be possible for a directly relevant grant."];
  }
  return [0, "Applicant type does not clearly match."];
}

function stageScore(project, grant, directRelevance) {
  if (directRelevance < 10) return [2, "Stage is not meaningful because direct project relevance is weak."];

  const stage = cleanText(project.project_stage).toLowerCase();
  const text = grantText(grant);
  if (["early planning", "planning", "pre-development"].includes(stage) &&
      ["planning", "technical assistance", "feasibility", "engineering", "design"].some(w => hasPhrase(text, w))) {
    return [8, "Grant may support planning/pre-development."];
  }
  if (["construction", "implementation"].includes(stage) &&
      ["construction", "implementation", "capital", "repair", "replacement", "rehabilitation"].some(w => hasPhrase(text, w))) {
    return [8, "Grant may support implementation/construction."];
  }
  return [4, "Project stage fit is unclear."];
}

function deadlineScore(grant) {
  const st = grant.status;
  if (st === "open") return [10, "Grant appears open."];
  if (st === "closing_soon") return [6, "Open but deadline is close."];
  if (st === "open_unknown_deadline" || st === "rolling") return [8, "Available but deadline needs review."];
  if (st === "forecasted") return [6, "Forecasted; useful for planning."];
  if (st === "closed") return [2, "Closed; consider watchlist if recurring."];
  return [4, "Status unclear."];
}

function costAndMatchScore(project, grant, directRelevance) {
  let points = 0;
  const reasons = [];

  if (project.estimated_cost == null) {
    points += 2;
    reasons.push("project cost estimate is missing");
  } else if (!grant.funding_amount) {
    points += 4;
    reasons.push("grant amount unclear");
  } else {
    points += 5;
    reasons.push("cost/award fit needs manual review");
  }

  const match = cleanText(grant.match_required).toLowerCase();
  const avail = project.match_available;
  if (match.includes("no")) {
    points += 5;
    reasons.push("no match appears required");
  } else if (match.includes("yes") && avail === true) {
    points += 5;
    reasons.push("match appears required and available");
  } else if (match.includes("yes") && avail !== true) {
    points += 1;
    reasons.push("match may be required but availability is unknown/unavailable");
  } else {
    points += 3;
    reasons.push("match requirement unclear");
  }

  if (directRelevance < 10) points = Math.min(points, 4);
  return [points, reasons.join("; ") + "."];
}

function impactScore(project, grant, directRelevance) {
  const kws = (project.impact_keywords || []).map(x => String(x).toLowerCase());
  const text = grantText(grant);
  const matched = kws.filter(k => hasPhrase(text, k));

  if (directRelevance < 10) {
    return [Math.min(3, matched.length), "Impact fit is weak because direct project relevance is weak."];
  }

  if (matched.length >= 3) return [10, `Strong impact match: ${matched.slice(0, 5).join(", ")}.`];
  if (matched.length >= 1) return [6, `Some impact match: ${matched.slice(0, 5).join(", ")}.`];
  return [3, "Impact fit needs more evidence."];
}

function missingRequirements(project) {
  const out = [];
  const docs = (project.documents_available || []).map(x => String(x).toLowerCase()).join(" ");
  const pt = projectText(project);

  if (project.estimated_cost == null) out.push("Preliminary cost estimate");
  if (project.match_available == null) out.push("Local match availability");
  if (!docs.includes("engineering")) out.push("Engineering memo or technical opinion");
  if ((hasAny(pt, ["water", "pipe", "pipes", "flooding", "stormwater", "sewer"]) && !docs.includes("water test"))) {
    out.push("Water/stormwater or infrastructure condition documentation");
  }
  if (!docs.includes("council") && !docs.includes("meeting")) out.push("Council resolution or approval record");
  return out;
}

function recommendation(total, grant, directRelevance) {
  if (directRelevance < 10) return "Low fit. Direct project relevance is weak despite any generic eligibility/status match.";
  if (grant.status === "closed") return "Closed now. Add to watchlist if recurring.";
  if (total >= 80) return "Strong candidate. Prepare missing documents and verify eligibility.";
  if (total >= 60) return "Possible candidate. Review blockers before spending application time.";
  return "Low fit.";
}

function applyCaps(project, grant, total, directRelevance) {
  let capped = total;

  if (directRelevance <= 5) capped = Math.min(capped, 35);
  else if (directRelevance < 10) capped = Math.min(capped, 45);
  else if (directRelevance < 18) capped = Math.min(capped, 65);

  if (looksLikeResearchHealthNoise(project, grant)) capped = Math.min(capped, 40);
  if (looksForeignOrGlobalMismatch(project, grant)) capped = Math.min(capped, 45);
  if (looksRecreationTrailMismatch(project, grant)) capped = Math.min(capped, 50);
  if (looksMappingResearchMismatch(project, grant)) capped = Math.min(capped, 45);
  if (falseBridgeMeaning(project, grant)) capped = Math.min(capped, 45);

  return Math.round(capped);
}

export function scoreGrants(project, grants) {
  return grants.map(grant => {
    const [directPoints, directReason] = directRelevanceScore(project, grant);

    const pieces = [
      ["Direct project relevance", directPoints, directReason],
      ["Applicant eligibility", ...applicantScore(project, grant, directPoints)],
      ["Project stage", ...stageScore(project, grant, directPoints)],
      ["Deadline feasibility", ...deadlineScore(grant)],
      ["Funding/match fit", ...costAndMatchScore(project, grant, directPoints)],
      ["Community impact match", ...impactScore(project, grant, directPoints)]
    ];

    const uncappedTotal = pieces.reduce((sum, p) => sum + p[1], 0);
    const total = applyCaps(project, grant, uncappedTotal, directPoints);

    return {
      ...grant,
      fit_score: total,
      score_breakdown: pieces.map(([name, points, reason]) => ({ name, points, reason })),
      missing_requirements: missingRequirements(project),
      recommendation: recommendation(total, grant, directPoints),
      direct_relevance_score: directPoints
    };
  }).sort((a, b) => {
    if (b.fit_score !== a.fit_score) return b.fit_score - a.fit_score;
    return b.direct_relevance_score - a.direct_relevance_score;
  });
}
