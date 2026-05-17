"use client";

import { memo, useCallback, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileText, Loader2, Sparkles, X } from "lucide-react";
import type { AnyRecord } from "../lib/grantpilotApi";
import {
  GrantPilotApi,
  asArray,
  getErrorMessage,
  getRecordField,
  getStringField,
  saveJson,
  STORAGE_KEYS,
  stripHtml
} from "../lib/grantpilotApi";

export const Translator = memo(function Translator() {
  const [grantText, setGrantText] = useState("");
  const [grantId, setGrantId] = useState("");
  const [requirements, setRequirements] = useState<AnyRecord | null>(null);
  const [selectedGrant, setSelectedGrant] = useState<AnyRecord | null>(null);
  const [traceId, setTraceId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  const handleProcess = useCallback(async () => {
    if (!grantText.trim() && !grantId.trim()) {
      setError("Paste grant text or enter a grant ID.");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      const payload = grantId.trim() ? { grant_id: grantId.trim() } : { grant_text: grantText.trim() };
      const output = await GrantPilotApi.requirements(payload);
      const result = getRecordField(output, "result");
      const translated = Object.keys(getRecordField(result, "requirements")).length
        ? getRecordField(result, "requirements")
        : getRecordField(output, "requirements");
      const grant = getRecordField(result, "selected_grant");

      setRequirements(Object.keys(translated).length ? translated : null);
      setSelectedGrant(Object.keys(grant).length ? grant : null);
      setTraceId(getStringField(output, "trace_id"));

      if (Object.keys(translated).length) saveJson(STORAGE_KEYS.latestRequirements, translated);
      if (getStringField(output, "trace_id")) saveJson(STORAGE_KEYS.latestTraceId, getStringField(output, "trace_id"));
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Could not translate requirements."));
    } finally {
      setIsProcessing(false);
    }
  }, [grantId, grantText]);

  const handleClear = useCallback(() => {
    setGrantText("");
    setGrantId("");
    setRequirements(null);
    setSelectedGrant(null);
    setTraceId("");
    setError("");
  }, []);

  const handleExport = useCallback(() => {
    if (!requirements) return;
    const blob = new Blob([JSON.stringify({ selectedGrant, requirements, traceId }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "grantpilot-requirements.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [requirements, selectedGrant, traceId]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5 mr-2" />
            Requirements Translator agent
          </div>
          <h1 className="text-3xl font-bold text-textPrimary tracking-tight mb-2">Requirements Translator</h1>
          <p className="text-textSecondary max-w-3xl">Paste NOFO text or enter a grant ID. GrantPilot turns dense grant language into eligibility, documents, deadlines, match requirements, risks, and application steps.</p>
        </div>

        {requirements && (
          <div className="flex gap-3">
            <button onClick={handleClear} className="px-4 py-2 bg-bgPanelLight hover:bg-bgPanel text-textPrimary rounded-xl text-sm font-semibold border border-borderColor flex items-center"><X className="w-4 h-4 mr-2" /> Clear</button>
            <button onClick={handleExport} className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold flex items-center"><Download className="w-4 h-4 mr-2" /> Export JSON</button>
          </div>
        )}
      </div>

      {error && <ErrorBox message={error} />}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 glass-panel rounded-2xl p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-textPrimary mb-2">Grant ID</label>
            <input value={grantId} onChange={(event) => setGrantId(event.target.value)} placeholder="Example: grantsgov_351567" className="w-full bg-bgPanel/60 border border-borderColor rounded-xl px-4 py-3 text-sm text-textPrimary focus:outline-none focus:border-primary" />
            <p className="text-xs text-textSecondary mt-2">Use this when selecting a grant from the database.</p>
          </div>

          <div className="text-center text-xs text-textSecondary">or</div>

          <div>
            <label className="block text-sm font-semibold text-textPrimary mb-2">Paste grant requirements text</label>
            <textarea value={grantText} onChange={(event) => setGrantText(event.target.value)} placeholder="Paste NOFO, eligibility, application instructions, deadline text..." className="w-full min-h-[260px] bg-bgPanel/60 border border-borderColor rounded-xl p-4 text-sm text-textPrimary focus:outline-none focus:border-primary resize-y" />
          </div>

          <button onClick={handleProcess} disabled={isProcessing || (!grantText.trim() && !grantId.trim())} className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center">
            {isProcessing ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Translating...</> : <><FileText className="w-5 h-5 mr-2" /> Translate requirements</>}
          </button>
        </div>

        <div className="xl:col-span-2">
          {requirements ? (
            <div className="space-y-6">
              <div className="glass-panel rounded-2xl p-6">
                <div className="flex items-center text-secondary font-semibold text-sm mb-3"><CheckCircle2 className="w-5 h-5 mr-2" /> Requirements translated</div>
                <h2 className="text-2xl font-bold text-textPrimary">{getStringField(selectedGrant, "title", "Translated Grant Requirements")}</h2>
                <p className="text-textSecondary mt-3">{getStringField(requirements, "plain_english_summary")}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ListCard title="Eligibility" items={requirements.eligibility_requirements} />
                <ListCard title="Required documents" items={requirements.required_documents} />
                <ListCard title="Deadlines" items={requirements.deadlines} />
                <ListCard title="Match and funding" items={[...asArray(requirements.match_requirements), ...asArray(requirements.funding_limits)]} />
                <ListCard title="Application steps" items={requirements.application_steps} />
                <ListCard title="Risk warnings" items={requirements.risk_warnings} warning />
              </div>

              {traceId && <div className="text-xs text-textSecondary">Trace: {traceId}</div>}
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-10 text-center text-textSecondary">
              <FileText className="w-12 h-12 mx-auto mb-4 text-primary" />
              Translate a grant to see plain-English requirements.
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

function ListCard({ title, items, warning = false }: { title: string; items: unknown; warning?: boolean }) {
  const list = asArray(items).filter(Boolean);
  return (
    <div className="glass-panel rounded-2xl p-5">
      <h3 className="font-bold text-textPrimary mb-3">{title}</h3>
      {list.length ? (
        <ul className="space-y-2">
          {list.map((item, index) => (
            <li key={index} className={`text-sm ${warning ? "text-amber-300" : "text-textSecondary"}`}>• {stripHtml(item)}</li>
          ))}
        </ul>
      ) : <p className="text-sm text-textSecondary">Not listed.</p>}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-start"><AlertTriangle className="w-5 h-5 mr-3 shrink-0" />{message}</div>;
}

export default Translator;
