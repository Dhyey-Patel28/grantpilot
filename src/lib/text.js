export function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function inferCategories(text) {
  const t = cleanText(text).toLowerCase();
  const mapping = {
    water: ["water", "drinking water", "wastewater", "sewer", "stormwater", "lead service"],
    transportation: ["road", "bridge", "transportation", "transit", "traffic", "sidewalk", "safe routes"],
    housing: ["housing", "home", "rental", "affordable", "zoning"],
    energy: ["energy", "grid", "renewable", "solar", "efficiency", "resilience", "microgrid"],
    broadband: ["broadband", "internet", "connectivity", "digital equity"],
    community_development: ["community development", "downtown", "revitalization", "placemaking", "corridor"],
    public_safety: ["public safety", "fire", "police", "emergency", "ems", "disaster"],
    agriculture: ["agriculture", "farm", "food", "rural"],
    workforce: ["workforce", "training", "career", "apprenticeship", "childcare"],
    environment: ["environment", "climate", "conservation", "great lakes", "brownfield", "remediation"],
    health: ["health", "healthcare", "public health", "rural health"]
  };
  return Object.entries(mapping)
    .filter(([_, words]) => words.some(w => t.includes(w)))
    .map(([cat]) => cat)
    .sort();
}

export function parseDateMaybe(value) {
  const s = cleanText(value);
  if (!s || ["unknown", "n/a", "none", "not specified"].includes(s.toLowerCase())) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export function determineStatus(record) {
  const raw = cleanText(record.status || record.oppStatus || "").toLowerCase();
  const due = parseDateMaybe(record.due_date || record.close_date || record.application_due_date);
  if (due) {
    const today = new Date();
    const dueDate = new Date(`${due}T23:59:59Z`);
    if (dueDate < today) return "closed";
    const days = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    return days <= 30 ? "closing_soon" : "open";
  }
  if (raw.includes("forecast")) return "forecasted";
  if (raw.includes("posted") || raw.includes("open")) return "open_unknown_deadline";
  if (raw.includes("closed") || raw.includes("archived")) return "closed";
  if (raw.includes("rolling")) return "rolling";
  return "unknown";
}
