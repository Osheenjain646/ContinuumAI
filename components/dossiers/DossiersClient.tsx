"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText, Plus, Trash2, RefreshCw, Clock, CheckCircle2,
  AlertCircle, Loader2, Shield, GitBranch, ExternalLink, User,
} from "lucide-react";
import { cn, formatRelativeTime, scoreToColor } from "@/lib/utils";
import type { StoredDossier } from "@/types";

interface DossierSummary extends Omit<StoredDossier, "sections" | "rawActivity"> {
  commitCount: number;
  slackCount: number;
  docsCount: number;
  alertCount: number;
}

const statusConfig = {
  pending: { label: "Pending", icon: Clock, color: "text-zinc-500 bg-zinc-100" },
  fetching: { label: "Fetching…", icon: Loader2, color: "text-blue-600 bg-blue-50", spin: true },
  synthesizing: { label: "Synthesizing…", icon: Loader2, color: "text-violet-600 bg-violet-50", spin: true },
  complete: { label: "Complete", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
  error: { label: "Error", icon: AlertCircle, color: "text-red-600 bg-red-50" },
};

function StatusBadge({ status }: { status: StoredDossier["status"] }) {
  const cfg = statusConfig[status] ?? statusConfig.pending;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", cfg.color)}>
      <cfg.icon size={11} className={(cfg as { spin?: boolean }).spin ? "animate-spin" : ""} />
      {cfg.label}
    </span>
  );
}

function NewDossierModal({ onClose, onCreated }: { onClose: () => void; onCreated: (d: StoredDossier) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [team, setTeam] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [slackUserId, setSlackUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/dossiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departingEmployee: { name, email, role, team, githubUsername, slackUserId,
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}` },
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create"); return; }
      onCreated(data);
    } catch { setError("Something went wrong"); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">New Handover Dossier</h2>
        <p className="text-sm text-zinc-500 mb-5">Enter details for the departing team member</p>

        {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-zinc-700 mb-1">Full Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} required placeholder="Alex Rivera"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-zinc-700 mb-1">Work Email *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="alex@company.com"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Role</label>
              <input value={role} onChange={e => setRole(e.target.value)} placeholder="Senior Engineer"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Team</label>
              <input value={team} onChange={e => setTeam(e.target.value)} placeholder="Infrastructure"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">GitHub Username</label>
              <input value={githubUsername} onChange={e => setGithubUsername(e.target.value)} placeholder="alexrivera"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Slack User ID</label>
              <input value={slackUserId} onChange={e => setSlackUserId(e.target.value)} placeholder="U04ABC123"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-200 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 rounded-lg bg-gradient-to-r from-violet-600 to-blue-500 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={13} className="animate-spin" /> Creating…</> : "Create Dossier"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DossiersClient({ initialDossiers }: { initialDossiers: StoredDossier[] }) {
  const router = useRouter();
  const [dossiers, setDossiers] = useState<DossierSummary[]>(
    initialDossiers.map(d => ({
      ...d,
      commitCount: d.rawActivity?.commits?.length ?? 0,
      slackCount: d.rawActivity?.slackMessages?.length ?? 0,
      docsCount: d.rawActivity?.docs?.length ?? 0,
      alertCount: d.sections?.secretAudit?.alerts?.length ?? 0,
    }))
  );
  const [showNewModal, setShowNewModal] = useState(false);
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreated = (dossier: StoredDossier) => {
    setShowNewModal(false);
    setDossiers(prev => [{
      ...dossier, commitCount: 0, slackCount: 0, docsCount: 0, alertCount: 0,
    }, ...prev]);
  };

  const handleFetch = async (dossierId: string) => {
    setFetchingId(dossierId);
    setDossiers(prev => prev.map(d => d.id === dossierId ? {
      ...d,
      status: "fetching",
      progress: 5,
      errorMessage: undefined,
    } : d));
    let finished = false;
    let polling = false;
    const stopPolling = () => {
      finished = true;
      clearInterval(poll);
      setFetchingId((current) => current === dossierId ? null : current);
    };
    const pollStatus = async () => {
      if (finished || polling) return;
      polling = true;
      try {
        const res = await fetch(`/api/dossiers/${dossierId}`);
        if (!res.ok) throw new Error("Unable to retrieve dossier status.");
        const data = await res.json() as StoredDossier;
        setDossiers(prev => prev.map(d => d.id === dossierId ? {
          ...d,
          status: data.status,
          progress: data.progress,
          readinessScore: data.readinessScore,
          errorMessage: data.errorMessage,
          commitCount: data.rawActivity?.commits?.length ?? 0,
          alertCount: data.sections?.secretAudit?.alerts?.length ?? 0,
        } : d));
        if (data.status === "complete" || data.status === "error") stopPolling();
      } catch {
        // Keep polling during transient status request failures.
      } finally {
        polling = false;
      }
    };
    const poll = setInterval(() => { void pollStatus(); }, 1500);
    void pollStatus();

    try {
      const response = await fetch(`/api/dossiers/${dossierId}/fetch`, { method: "POST" });
      if (!response.ok) {
        const result = await response.json() as { error?: string };
        throw new Error(result.error ?? "Unable to fetch this dossier.");
      }
      await pollStatus();
    } catch (err) {
      setDossiers(prev => prev.map(d => d.id === dossierId ? {
        ...d,
        status: "error",
        errorMessage: err instanceof Error ? err.message : "Unable to fetch this dossier.",
      } : d));
      stopPolling();
    }
  };

  const handleDelete = async (dossierId: string) => {
    if (!confirm("Delete this dossier? This cannot be undone.")) return;
    setDeletingId(dossierId);
    await fetch(`/api/dossiers/${dossierId}`, { method: "DELETE" });
    setDossiers(prev => prev.filter(d => d.id !== dossierId));
    setDeletingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Handover Dossiers</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{dossiers.length} dossier{dossiers.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-blue-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          <Plus size={15} />
          New Dossier
        </button>
      </div>

      {/* Empty state */}
      {dossiers.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-white py-16 gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50">
            <FileText size={24} className="text-violet-500" />
          </div>
          <div className="text-center">
            <h3 className="text-base font-semibold text-zinc-900">No dossiers yet</h3>
            <p className="text-sm text-zinc-500 mt-1">Create your first handover dossier to get started</p>
          </div>
          <button onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
            <Plus size={14} />
            Create first dossier
          </button>
        </div>
      )}

      {/* Dossier cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {dossiers.map((d) => (
          <div key={d.id} className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden hover:border-zinc-300 transition-colors">
            <div className="h-1 bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-400" />
            <div className="p-4">
              <div className="flex items-start gap-3">
                <img src={d.departingEmployee.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(d.departingEmployee.name)}`}
                  alt="" className="h-10 w-10 rounded-full bg-zinc-100 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900 truncate">{d.departingEmployee.name}</h3>
                      <p className="text-xs text-zinc-500 truncate">{d.departingEmployee.role} · {d.departingEmployee.team}</p>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>

                  {(d.status === "fetching" || d.status === "synthesizing") && d.progress !== undefined && (
                    <div className="mt-2">
                      <div className="h-1.5 w-full rounded-full bg-zinc-100">
                        <div className="h-1.5 rounded-full bg-violet-500 transition-all" style={{ width: `${d.progress}%` }} />
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1">{d.progress}% complete</p>
                    </div>
                  )}

                  {d.status === "error" && (
                    <p className="mt-2 text-xs text-red-600">
                      {d.errorMessage || "Fetch failed. Check your integrations and try again."}
                    </p>
                  )}

                  {d.status === "complete" && (
                    <div className="mt-2 flex gap-3">
                      <span className={cn("text-lg font-bold", scoreToColor(d.readinessScore))}>{d.readinessScore}%</span>
                      <div className="flex gap-2 text-xs text-zinc-400">
                        <span><GitBranch size={10} className="inline mr-0.5" />{d.commitCount} commits</span>
                        {d.alertCount > 0 && <span className="text-red-500"><Shield size={10} className="inline mr-0.5" />{d.alertCount} alerts</span>}
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-zinc-400 mt-2">Updated {formatRelativeTime(d.lastUpdated)}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                {d.status === "complete" && (
                  <Link href={`/dashboard/${d.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-violet-50 py-2 text-xs font-medium text-violet-700 hover:bg-violet-100">
                    <ExternalLink size={12} /> View Dossier
                  </Link>
                )}
                <button onClick={() => handleFetch(d.id)} disabled={fetchingId === d.id || d.status === "fetching" || d.status === "synthesizing"}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50">
                  <RefreshCw size={12} className={fetchingId === d.id ? "animate-spin" : ""} />
                  {d.status === "pending" ? "Fetch Data" : "Re-fetch"}
                </button>
                <button onClick={() => handleDelete(d.id)} disabled={deletingId === d.id}
                  className="rounded-lg border border-zinc-200 px-2.5 py-2 text-xs text-zinc-400 hover:text-red-500 hover:border-red-200 disabled:opacity-50">
                  {deletingId === d.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showNewModal && <NewDossierModal onClose={() => setShowNewModal(false)} onCreated={handleCreated} />}
    </div>
  );
}
