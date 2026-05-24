"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Clapperboard,
  FileText,
  MonitorPlay,
  MousePointer2,
  RadioTower,
  Sparkles
} from "lucide-react";
import { getRecordingMode, setRecordingMode } from "../lib/grantpilotApi";

const shotList = [
  { title: "Dashboard hook", detail: "Slow zoom into the hero and show the product promise." },
  { title: "Project Intake", detail: "Paste one clean scenario, zoom to Demo/Offline Mode, then run the workflow." },
  { title: "Agent workflow", detail: "Record the running state and final trace summary as separate clips." },
  { title: "Grant Explorer", detail: "Show top matches, trust badges, filters, and one official source link." },
  { title: "Readiness Packet", detail: "Make this the final reveal: score, gaps, trust review, and export buttons." },
  { title: "Saved Projects", detail: "Show that the app still works from saved local project memory." }
];

const setupChecklist = [
  "Turn on Demo Mode or Offline Mode before recording repeated takes.",
  "Use one strong scenario, not several different examples.",
  "Set browser zoom to 90–100% and hide bookmarks.",
  "Record separate clips instead of one long take.",
  "Use Cursorful or CapCut zooms to follow the input, run button, top match, and packet exports.",
  "Keep captions short: Ranked matches, Trust review, Saved projects, Export packet."
];

export const RecordingGuide = memo(function RecordingGuide() {
  const [recordingMode, setRecordingModeState] = useState(false);

  useEffect(() => {
    setRecordingModeState(getRecordingMode());
  }, []);

  const toggleRecordingMode = useCallback((value: boolean) => {
    setRecordingMode(value);
    setRecordingModeState(value);
    document.documentElement.classList.toggle("recording-mode", value);
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      <section className="rounded-[2rem] border border-primary/10 bg-bgPanel/75 shadow-xl shadow-black/5 overflow-hidden">
        <div className="p-6 lg:p-8">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-end">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-5">
                <Clapperboard className="w-3.5 h-3.5 mr-2" />
                Video recording workspace
              </div>
              <h1 className="text-3xl lg:text-5xl font-black text-textPrimary tracking-tight">
                Record GrantPilot like a product demo.
              </h1>
              <p className="text-textSecondary mt-3 max-w-3xl leading-relaxed">
                Use this page as a shot checklist. The goal is a calm walkthrough: one scenario,
                saved data for reliability, tight zooms, and the readiness packet as the payoff.
              </p>
            </div>

            <label className="rounded-2xl border border-secondary/20 bg-secondary/5 p-5 cursor-pointer flex items-start gap-3">
              <input
                type="checkbox"
                checked={recordingMode}
                onChange={(event) => toggleRecordingMode(event.target.checked)}
                className="mt-1 h-4 w-4 accent-secondary"
              />
              <span>
                <span className="block text-sm font-black text-textPrimary">Recording Mode</span>
                <span className="block text-xs text-textSecondary mt-1 leading-relaxed">
                  Adds a global flag for cleaner captures. Pair this with Demo Mode or Offline Mode.
                </span>
              </span>
            </label>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
        <div className="glass-panel rounded-2xl p-6 lg:p-7">
          <h2 className="text-2xl font-black text-textPrimary flex items-center mb-5">
            <Camera className="w-6 h-6 mr-2 text-primary" />
            Shot list
          </h2>
          <div className="space-y-3">
            {shotList.map((shot, index) => (
              <div key={shot.title} className="rounded-2xl border border-borderColor bg-bgPanel/50 p-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-black">
                    {index + 1}
                  </span>
                  <div>
                    <div className="font-black text-textPrimary">{shot.title}</div>
                    <div className="text-sm text-textSecondary mt-1">{shot.detail}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="xl:sticky xl:top-6 space-y-6">
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="text-xl font-black text-textPrimary flex items-center mb-4">
              <MonitorPlay className="w-5 h-5 mr-2 text-secondary" />
              Recording setup
            </h2>
            <div className="space-y-3 text-sm text-textSecondary">
              {setupChecklist.map((item) => (
                <div key={item} className="flex items-start">
                  <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 text-secondary shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
            <h2 className="text-xl font-black text-textPrimary flex items-center mb-4">
              <Sparkles className="w-5 h-5 mr-2 text-primary" />
              Best capture flow
            </h2>
            <ol className="space-y-3 text-sm text-textSecondary">
              <li><span className="font-black text-textPrimary">1.</span> Open Intake and turn on Demo Mode.</li>
              <li><span className="font-black text-textPrimary">2.</span> Record each shot as its own clip.</li>
              <li><span className="font-black text-textPrimary">3.</span> Use cursor-following zooms on buttons and final outputs.</li>
              <li><span className="font-black text-textPrimary">4.</span> End on packet export or Saved Projects.</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <Link href="/intake" className="px-4 py-3 rounded-xl bg-primary text-white font-black inline-flex items-center justify-center">
              Start recording at Intake <MousePointer2 className="w-4 h-4 ml-2" />
            </Link>
            <Link href="/packet" className="px-4 py-3 rounded-xl border border-borderColor bg-bgPanelLight text-textPrimary font-black inline-flex items-center justify-center">
              Show packet payoff <FileText className="w-4 h-4 ml-2" />
            </Link>
            <Link href="/projects" className="px-4 py-3 rounded-xl border border-borderColor bg-bgPanelLight text-textPrimary font-black inline-flex items-center justify-center">
              Show saved projects <RadioTower className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </aside>
      </section>
    </div>
  );
});

export default RecordingGuide;
