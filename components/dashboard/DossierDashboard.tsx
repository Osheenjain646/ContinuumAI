"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity, Layers, Brain, ShieldAlert, MessageSquare, RefreshCw,
  ChevronLeft, Zap, Bell, Clock, CheckCircle2, AlertCircle, Loader2,
  GitBranch, Shield, MessageCircle, FileText, Save, Edit3, X,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ActiveWorkPanel } from "@/components/dashboard/ActiveWorkPanel";
import { ServiceOwnershipPanel } from "@/components/dashboard/ServiceOwnershipPanel";
import { ImplicitKnowledgePanel } from "@/components/dashboard/ImplicitKnowledgePanel";
import { SecretAuditPanel } from "@/components/dashboard/SecretAuditPanel";
import { AskDepartureChat } from "@/components/chat/AskDepartureChat";
import { cn, scoreToColor, formatRelativeTime } from "@/lib/utils";
import type { StoredDossier } from "@/types";

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color =
    score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : score >= 40 ? "#f97316" : "#ef4444";

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f4f4f5" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={8}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text
        x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        className="rotate-90" style={{ transform: `rotate(90deg)`, transformOrigin: "50% 50%", fill: color, fontSize: size / 4, fontWeight: 700 }}
      >
        {score}%
      </text>
    </svg>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending: { label: "Pending", icon: Clock, color: "text-zinc-500 bg-zinc-100" },
  fetching: { label: "Fetching…", icon: Loader2, color: "text-blue-600 bg-blue-50", spin: true },
  synthesizing: { label: "Synthesizing…", icon: Loader2, color: "text-violet-600 bg-violet-50", spin: true },
  complete: { label: "Complete", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
  error: { label: "Error", icon: AlertCircle, color: "text-red-600 bg-red-50" },
};

function StatusBadge({ status }: { status: StoredDossier["status"] }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", cfg.color)}>
      <cfg.icon size={12} className={(cfg as { spin?: boolean }).spin ? "animate-spin" : ""} />
      {cfg.label}
    </span>
  );
}

// ─── User notes editor ────────────────────────────────────────────────────────

function NotesEditor({ dossierId, initial, editedAt, editedBy }: {
  dossierId: string;
  initial: string;
  editedAt?: string;
  editedBy?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/dossiers/${dossierId}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!response.ok) {
        const result = await response.json() as { error?: string };
        throw new Error(result.error ?? "Unable to save notes.");
      }
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save notes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Edit3 size={15} className="text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-900">Notes & Overrides</h3>
          {saved && <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 size={11} /> Saved</span>}
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
        {!editing ? (
          <button onClick={() => { setError(""); setEditing(true); }} className="text-xs text-violet-600 hover:text-violet-800 font-medium">Edit</button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => { setEditing(false); setNotes(initial); }}
              className="text-xs text-zinc-400 hover:text-zinc-600 flex items-center gap-1"><X size={12} /> Cancel</button>
            <button onClick={save} disabled={saving}
              className="text-xs text-violet-600 hover:text-violet-800 font-medium flex items-center gap-1">
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Save
            </button>
          </div>
        )}
      </div>

      {editedAt && (
        <p className="text-[11px] text-zinc-400 mb-2">Last edited by {editedBy} · {formatRelativeTime(editedAt)}</p>
      )}

      {editing ? (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={6}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
          placeholder="Add handover notes, context, corrections, or any other information…"
        />
      ) : (
        <div className="text-sm text-zinc-600 whitespace-pre-wrap min-h-[3rem]">
          {notes || <span className="text-zinc-400 italic">No notes yet. Click Edit to add handover notes or corrections.</span>}
        </div>
      )}
    </div>
  );
}

// ─── Raw Activity Summary ─────────────────────────────────────────────────────

function ActivityBar({ dossier }: { dossier: StoredDossier }) {
  const { rawActivity, sections } = dossier;
  const stats = [
    { label: "Commits", value: rawActivity?.commits?.length ?? 0, icon: GitBranch, color: "text-violet-500" },
    { label: "PRs", value: rawActivity?.pullRequests?.length ?? 0, icon: GitBranch, color: "text-blue-500" },
    { label: "Slack", value: rawActivity?.slackMessages?.length ?? 0, icon: MessageCircle, color: "text-emerald-500" },
    { label: "Docs", value: rawActivity?.docs?.length ?? 0, icon: FileText, color: "text-amber-500" },
    { label: "Meetings", value: rawActivity?.meetingTranscripts?.length ?? 0, icon: MessageSquare, color: "text-rose-500" },
    { label: "Alerts", value: sections?.secretAudit?.alerts?.length ?? 0, icon: Shield, color: "text-red-500" },
  ];

  return (
    <div className="flex flex-wrap gap-4">
      {stats.map((s) => (
        <div key={s.label} className="flex items-center gap-1.5">
          <s.icon size={13} className={s.color} />
          <span className="text-sm font-semibold text-zinc-900">{s.value}</span>
          <span className="text-xs text-zinc-400">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DossierDashboard({ dossier: initialDossier }: { dossier: StoredDossier }) {
  const [dossier, setDossier] = useState<StoredDossier>(initialDossier);
  const [activeTab, setActiveTab] = useState("active-work");

  useEffect(() => {
    if (dossier.status !== "fetching" && dossier.status !== "synthesizing") return;
    let active = true;
    const poll = async () => {
      try {
        const response = await fetch(`/api/dossiers/${dossier.id}`);
        if (!response.ok) throw new Error("Unable to retrieve dossier status.");
        const updated = await response.json() as StoredDossier;
        if (active) setDossier(updated);
      } catch (err) {
        if (active) {
          setDossier((current) => ({
            ...current,
            status: "error",
            errorMessage: err instanceof Error ? err.message : "Unable to retrieve dossier status.",
          }));
        }
      }
    };
    void poll();
    const interval = setInterval(() => { void poll(); }, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [dossier.id, dossier.status]);

  const handleFetch = async () => {
    setDossier((current) => ({
      ...current,
      status: "fetching",
      progress: 5,
      errorMessage: undefined,
    }));
    try {
      const response = await fetch(`/api/dossiers/${dossier.id}/fetch`, { method: "POST" });
      const result = await response.json() as StoredDossier | { error?: string };
      if (!response.ok) {
        throw new Error("error" in result ? result.error ?? "Unable to refresh this dossier." : "Unable to refresh this dossier.");
      }
      setDossier(result as StoredDossier);
    } catch (err) {
      setDossier((current) => ({
        ...current,
        status: "error",
        errorMessage: err instanceof Error ? err.message : "Unable to refresh this dossier.",
      }));
    }
  };
  const fetching = dossier.status === "fetching" || dossier.status === "synthesizing";

  const criticalAlerts = dossier.sections?.secretAudit?.alerts?.filter(a => a.severity === "critical").length ?? 0;

  const tabs = [
    {
      value: "active-work", label: "Active Work", icon: Activity,
      alertCount: dossier.sections?.activeWork?.inFlightTasks?.filter(t => t.status === "blocked").length ?? 0,
      alertColor: "bg-red-500",
    },
    {
      value: "ownership", label: "Ownership Map", icon: Layers,
      alertCount: dossier.sections?.serviceOwnership?.ownedServices?.filter(s => !s.coOwners?.length).length ?? 0,
      alertColor: "bg-orange-500",
    },
    {
      value: "knowledge", label: "Implicit Knowledge", icon: Brain,
      alertCount: dossier.sections?.implicitKnowledge?.techDebt?.filter(d => d.severity === "high").length ?? 0,
      alertColor: "bg-yellow-500",
    },
    {
      value: "security", label: "Security Audit", icon: ShieldAlert,
      alertCount: dossier.sections?.secretAudit?.alerts?.filter(a => a.severity === "critical" || a.severity === "high").length ?? 0,
      alertColor: "bg-red-600",
    },
    { value: "chat", label: "Ask Bot", icon: MessageSquare, alertCount: 0, alertColor: "" },
  ];

  const showPending = dossier.status === "pending";
  const showLoading = dossier.status === "fetching" || dossier.status === "synthesizing";

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link href="/dossiers" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
            <ChevronLeft size={16} /> Dossiers
          </Link>
          <div className="h-4 w-px bg-zinc-200" />
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={dossier.departingEmployee.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(dossier.departingEmployee.name)}`}
              alt="" className="h-7 w-7 rounded-full bg-zinc-100 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900 truncate">{dossier.departingEmployee.name}</p>
              <p className="text-[11px] text-zinc-400 truncate">{dossier.departingEmployee.role} · {dossier.departingEmployee.team}</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <StatusBadge status={dossier.status} />
            {criticalAlerts > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-2.5 py-1">
                <Bell size={12} className="text-red-600" />
                <span className="text-xs font-medium text-red-700">{criticalAlerts} critical</span>
              </div>
            )}
            <button onClick={handleFetch} disabled={fetching}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50">
              <RefreshCw size={12} className={fetching ? "animate-spin" : ""} />
              <span className="hidden sm:block">{dossier.status === "pending" ? "Fetch Data" : "Re-fetch"}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {/* Hero card */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
          <div className="h-1 bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-400" />
          <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <img
              src={dossier.departingEmployee.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(dossier.departingEmployee.name)}`}
              alt="" className="h-16 w-16 rounded-2xl bg-zinc-100 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-zinc-900">{dossier.departingEmployee.name}</h1>
              <p className="text-sm text-zinc-500 mt-0.5">{dossier.departingEmployee.email}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {dossier.departingEmployee.role && (
                  <span className="rounded-full bg-violet-50 border border-violet-200 px-2 py-0.5 text-xs text-violet-700">{dossier.departingEmployee.role}</span>
                )}
                {dossier.departingEmployee.team && (
                  <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs text-blue-700">{dossier.departingEmployee.team}</span>
                )}
              </div>
              <div className="mt-3">
                <ActivityBar dossier={dossier} />
              </div>
              <p className="text-[11px] text-zinc-400 mt-2">Last updated {formatRelativeTime(dossier.lastUpdated)}</p>
            </div>
            {dossier.status === "complete" && (
              <div className="flex flex-col items-center shrink-0">
                <ScoreRing score={dossier.readinessScore} />
                <p className="text-xs text-zinc-500 mt-1 text-center">Readiness<br />Score</p>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar while fetching */}
        {showLoading && dossier.progress !== undefined && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-700">
                {dossier.status === "fetching" ? "Fetching data from all connected sources…" : "AI is synthesizing the dossier…"}
              </p>
              <span className="text-sm text-violet-600 font-medium">{dossier.progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-100">
              <div className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all duration-500" style={{ width: `${dossier.progress}%` }} />
            </div>
          </div>
        )}

        {/* Pending state */}
        {showPending && (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-white py-16 gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50">
              <Zap size={24} className="text-violet-500" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-semibold text-zinc-900">Ready to fetch</h3>
              <p className="text-sm text-zinc-500 mt-1 max-w-sm">
                Click &ldquo;Fetch Data&rdquo; to pull activity from all your configured integrations. Make sure you&apos;ve set up your integrations first.
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/integrations" className="flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50">
                Configure Integrations
              </Link>
              <button onClick={handleFetch}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-blue-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90">
                <RefreshCw size={14} /> Fetch Data
              </button>
            </div>
          </div>
        )}

        {/* Error state */}
        {dossier.status === "error" && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={16} className="text-red-500" />
              <h3 className="text-sm font-semibold text-red-700">Fetch Failed</h3>
            </div>
            <p className="text-sm text-red-600">{dossier.errorMessage ?? "An unknown error occurred"}</p>
            <button onClick={handleFetch} className="mt-3 text-sm text-red-700 underline hover:no-underline">Try again</button>
          </div>
        )}

        {dossier.status === "complete" && Boolean(dossier.fetchWarnings?.length) && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <h3 className="text-sm font-semibold text-amber-800">Some configured sources returned no activity</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-700">
              {dossier.fetchWarnings?.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          </div>
        )}

        {/* Tabs — only show when complete or after re-fetch */}
        {(dossier.status === "complete" || (dossier.status !== "pending" && dossier.rawActivity?.commits?.length !== undefined)) && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex h-auto flex-wrap gap-1 bg-zinc-100 p-1">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1.5">
                  <tab.icon size={14} />
                  <span className="hidden sm:block">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
                  {tab.alertCount > 0 && (
                    <span className={cn("inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white", tab.alertColor)}>
                      {tab.alertCount}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="active-work">
              {dossier.sections?.activeWork
                ? <ActiveWorkPanel section={dossier.sections.activeWork} />
                : <EmptySection label="Active Work" />}
            </TabsContent>
            <TabsContent value="ownership">
              {dossier.sections?.serviceOwnership
                ? <ServiceOwnershipPanel section={dossier.sections.serviceOwnership} />
                : <EmptySection label="Service Ownership" />}
            </TabsContent>
            <TabsContent value="knowledge">
              {dossier.sections?.implicitKnowledge
                ? <ImplicitKnowledgePanel section={dossier.sections.implicitKnowledge} />
                : <EmptySection label="Implicit Knowledge" />}
            </TabsContent>
            <TabsContent value="security">
              {dossier.sections?.secretAudit
                ? <SecretAuditPanel section={dossier.sections.secretAudit} />
                : <EmptySection label="Security Audit" />}
            </TabsContent>
            <TabsContent value="chat">
              <AskDepartureChat dossier={dossier} />
            </TabsContent>
          </Tabs>
        )}

        {/* Notes editor */}
        <NotesEditor
          dossierId={dossier.id}
          initial={dossier.userEdits?.notes ?? ""}
          editedAt={dossier.userEdits?.editedAt}
          editedBy={dossier.userEdits?.editedBy}
        />

        {/* Readiness breakdown */}
        {dossier.status === "complete" && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-zinc-900 mb-4">Readiness Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(dossier.readinessBreakdown).map(([key, val]) => {
                const labels: Record<string, string> = {
                  activeWork: "Active Work", serviceOwnership: "Service Ownership",
                  implicitKnowledge: "Implicit Knowledge", securityAudit: "Security Audit",
                };
                return (
                  <div key={key}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-zinc-600">{labels[key] ?? key}</span>
                      <span className={cn("text-xs font-semibold", scoreToColor(val))}>{val}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-100">
                      <div
                        className="h-1.5 rounded-full transition-all duration-700"
                        style={{
                          width: `${val}%`,
                          background: val >= 80 ? "#10b981" : val >= 60 ? "#f59e0b" : val >= 40 ? "#f97316" : "#ef4444",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function EmptySection({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
      <p className="text-sm text-zinc-400">{label} data not yet available. Fetch data to populate this section.</p>
    </div>
  );
}
