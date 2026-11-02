"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Settings2, FileText, Video,
  Loader2, CheckCircle2, AlertCircle, Plus, Trash2, ChevronDown, ChevronUp,
  Link as LinkIcon, Lock, Save, RefreshCw, Code2, GitBranch, MessageSquare,
  Database, Layers, Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserIntegrations } from "@/types";

// ─── Section UI helpers ────────────────────────────────────────────────────────

function SectionCard({
  title, icon: Icon, color, children, defaultOpen = false,
}: {
  title: string;
  icon: React.ElementType;
  color: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 hover:bg-zinc-50 transition-colors"
      >
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg shrink-0", color)}>
          <Icon size={16} className="text-white" />
        </span>
        <span className="flex-1 text-left text-sm font-semibold text-zinc-900">{title}</span>
        {open ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
      </button>
      {open && <div className="border-t border-zinc-100 px-5 py-4 space-y-4">{children}</div>}
    </div>
  );
}

function Field({
  label, hint, value, onChange, type = "text", placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-700 mb-1">{label}</label>
      {hint && <p className="text-[11px] text-zinc-400 mb-1.5">{hint}</p>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
      />
    </div>
  );
}

function TagsField({
  label, hint, values, onChange, placeholder,
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  const add = () => {
    const v = input.trim();
    if (v && !values.includes(v)) {
      onChange([...values, v]);
      setInput("");
    }
  };

  return (
    <div>
      <label className="block text-xs font-medium text-zinc-700 mb-1">{label}</label>
      {hint && <p className="text-[11px] text-zinc-400 mb-1.5">{hint}</p>}
      <div className="flex gap-2 mb-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
        <button
          type="button"
          onClick={add}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
        >
          <Plus size={14} />
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-200 px-2.5 py-0.5 text-xs text-violet-700"
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="hover:text-red-500"
              >
                <Trash2 size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Custom integrations ───────────────────────────────────────────────────────

type CustomEntry = { key: string; label: string; url: string; token: string; notes: string };

function CustomSection({
  custom,
  onChange,
}: {
  custom: UserIntegrations["custom"];
  onChange: (v: UserIntegrations["custom"]) => void;
}) {
  const entries: CustomEntry[] = Object.entries(custom ?? {}).map(([key, v]) => ({
    key,
    label: v.label,
    url: v.url ?? "",
    token: v.token ?? "",
    notes: v.notes ?? "",
  }));

  const update = (key: string, field: keyof Omit<CustomEntry, "key">, value: string) => {
    const updated = { ...(custom ?? {}) };
    if (!updated[key]) updated[key] = { label: key };
    updated[key] = { ...updated[key], [field]: value };
    onChange(updated);
  };

  const remove = (key: string) => {
    const updated = { ...(custom ?? {}) };
    delete updated[key];
    onChange(updated);
  };

  const addNew = () => {
    const key = `custom_${Date.now()}`;
    onChange({ ...(custom ?? {}), [key]: { label: "New Integration" } });
  };

  return (
    <SectionCard title="Custom / Company-Specific" icon={Settings2} color="bg-zinc-500">
      <p className="text-xs text-zinc-500">
      Add exact HTTPS links that return readable text, HTML, JSON, or XML from other company tools.
      </p>
      <div className="space-y-4">
        {entries.map((entry) => (
          <div key={entry.key} className="rounded-lg border border-zinc-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <input
                value={entry.label}
                onChange={(e) => update(entry.key, "label", e.target.value)}
                className="text-sm font-medium text-zinc-900 border-none outline-none bg-transparent flex-1"
                placeholder="Integration name"
              />
              <button
                type="button"
                onClick={() => remove(entry.key)}
                className="text-zinc-400 hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field
                label="URL"
                value={entry.url}
                onChange={(v) => update(entry.key, "url", v)}
                placeholder="https://..."
              />
              <Field
                label="Token / API Key"
                type="password"
                value={entry.token}
                onChange={(v) => update(entry.key, "token", v)}
                placeholder="sk-..."
              />
              <div className="sm:col-span-2">
                <Field
                  label="Notes"
                  value={entry.notes}
                  onChange={(v) => update(entry.key, "notes", v)}
                  placeholder="Optional notes..."
                />
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addNew}
          className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-4 py-2.5 text-sm text-zinc-500 hover:border-violet-400 hover:text-violet-600 w-full justify-center"
        >
          <Plus size={14} /> Add custom integration
        </button>
      </div>
    </SectionCard>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const emptyIntegrations: UserIntegrations = {
  userId: "",
  updatedAt: "",
  github: { token: "", username: "", orgOrRepoUrl: "", repos: [] },
  gitlab: { token: "", baseUrl: "https://gitlab.com", username: "", projectIds: [] },
  bitbucket: { username: "", accountId: "", appPassword: "", workspace: "", repoSlugs: [] },
  slack: { botToken: "", userToken: "", userId: "", channelIds: [] },
  notion: { token: "", pageUrls: [], databaseIds: [] },
  jira: { baseUrl: "", email: "", apiToken: "", accountId: "", projectKeys: [] },
  meetings: { transcriptUrls: [], googleDocsToken: "", zoomApiKey: "", zoomApiSecret: "" },
  linear: { apiKey: "", teamIds: [], memberId: "" },
  confluence: { baseUrl: "", email: "", apiToken: "", spaceKeys: [] },
  asana: { accessToken: "", workspaceId: "", userId: "" },
  custom: {},
};

function str(v: string | undefined): string { return v ?? ""; }
function arr(v: string[] | undefined): string[] { return v ?? []; }

async function fetchIntegrationSettings(): Promise<UserIntegrations> {
  const res = await fetch("/api/integrations");
  if (!res.ok) throw new Error("Unable to load integration settings.");
  return res.json() as Promise<UserIntegrations>;
}

export default function IntegrationsPage() {
  const [cfg, setCfg] = useState<UserIntegrations>(emptyIntegrations);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchIntegrationSettings();
      setCfg({ ...emptyIntegrations, ...data });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load integration settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchIntegrationSettings()
      .then((data) => {
        if (active) setCfg({ ...emptyIntegrations, ...data });
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Unable to load integration settings.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const save = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Save failed");
      }
    } catch {
      setError("Something went wrong");
    }
    setSaving(false);
  };

  const set = <K extends keyof UserIntegrations>(
    section: K,
    field: string,
    value: string | string[]
  ) => {
    setCfg((prev) => ({
      ...prev,
      [section]: { ...(prev[section] as Record<string, unknown> ?? {}), [field]: value },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin text-violet-500" />
      </div>
    );
  }

  const gh = cfg.github ?? {};
  const gl = cfg.gitlab ?? {};
  const bb = cfg.bitbucket ?? {};
  const sl = cfg.slack ?? {};
  const nt = cfg.notion ?? {};
  const jr = cfg.jira ?? {};
  const mt = cfg.meetings ?? {};
  const ln = cfg.linear ?? {};
  const cf = cfg.confluence ?? {};
  const as = cfg.asana ?? {};

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Integrations</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Connect your tools. All fields are optional — data is only fetched from configured sources.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={load}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            <RefreshCw size={13} /> Reset
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {saved && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 size={14} /> Settings saved successfully.
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
        <Lock size={14} className="text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700">
          All tokens and secrets are stored server-side and never exposed to the browser. Existing secrets show as{" "}
          <code className="font-mono">••••••••</code>.
        </p>
      </div>

      {/* ── GitHub ────────────────────────────────────────────── */}
      <SectionCard title="GitHub" icon={Code2} color="bg-zinc-900" defaultOpen>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Personal Access Token"
            type="password"
            value={str(gh.token)}
            onChange={(v) => set("github", "token", v)}
            hint="PAT with repo + read:user scope"
            placeholder="ghp_..."
          />
          <Field
            label="GitHub Username"
            value={str(gh.username)}
            onChange={(v) => set("github", "username", v)}
            placeholder="octocat"
          />
          <div className="sm:col-span-2">
            <Field
              label="Org or Repo URL"
              value={str(gh.orgOrRepoUrl)}
              onChange={(v) => set("github", "orgOrRepoUrl", v)}
              hint="Only the specified organization or repository is queried"
              placeholder="https://github.com/your-org"
            />
          </div>
          <div className="sm:col-span-2">
            <TagsField
              label="Specific Repos to Track"
              values={arr(gh.repos)}
              onChange={(v) => set("github", "repos", v)}
              hint="Add owner/repo values or repository URLs — up to 100 commits per repo"
              placeholder="org/repo-name or https://github.com/org/repo"
            />
          </div>
        </div>
      </SectionCard>

      {/* ── GitLab ────────────────────────────────────────────── */}
      <SectionCard title="GitLab" icon={GitBranch} color="bg-orange-500">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Personal Access Token"
            type="password"
            value={str(gl.token)}
            onChange={(v) => set("gitlab", "token", v)}
            hint="Token with read_api scope"
            placeholder="glpat-..."
          />
          <Field
            label="GitLab Username"
            value={str(gl.username)}
            onChange={(v) => set("gitlab", "username", v)}
            placeholder="your-username"
          />
          <div className="sm:col-span-2">
            <Field
              label="Base URL"
              value={str(gl.baseUrl)}
              onChange={(v) => set("gitlab", "baseUrl", v)}
              hint="Leave as-is for GitLab.com or enter your self-hosted URL"
              placeholder="https://gitlab.com"
            />
          </div>
          <div className="sm:col-span-2">
            <TagsField
              label="Project IDs / Slugs"
              values={arr(gl.projectIds)}
              onChange={(v) => set("gitlab", "projectIds", v)}
              hint="Project IDs, namespace/project slugs, or full project URLs"
              placeholder="namespace/project or https://gitlab.com/group/project"
            />
          </div>
        </div>
      </SectionCard>

      {/* ── Bitbucket ─────────────────────────────────────────── */}
      <SectionCard title="Bitbucket" icon={Layers} color="bg-blue-600">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Bitbucket Username"
            value={str(bb.username)}
            onChange={(v) => set("bitbucket", "username", v)}
            placeholder="your-username"
          />
          <Field
            label="Employee Account ID"
            value={str(bb.accountId)}
            onChange={(v) => set("bitbucket", "accountId", v)}
            hint="Used to scope pull requests to the employee"
            placeholder="account UUID"
          />
          <Field
            label="App Password"
            type="password"
            value={str(bb.appPassword)}
            onChange={(v) => set("bitbucket", "appPassword", v)}
            hint="Create in Account Settings → App passwords"
            placeholder="••••••••"
          />
          <Field
            label="Workspace Slug"
            value={str(bb.workspace)}
            onChange={(v) => set("bitbucket", "workspace", v)}
            placeholder="my-workspace"
          />
          <div className="sm:col-span-2">
            <TagsField
              label="Repository Slugs"
              values={arr(bb.repoSlugs)}
              onChange={(v) => set("bitbucket", "repoSlugs", v)}
              hint="Add repo slugs or repository URLs"
              placeholder="my-repo or https://bitbucket.org/workspace/my-repo"
            />
          </div>
        </div>
      </SectionCard>

      {/* ── Slack ─────────────────────────────────────────────── */}
      <SectionCard title="Slack" icon={MessageSquare} color="bg-emerald-600">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field
              label="Bot Token"
              type="password"
              value={str(sl.botToken)}
              onChange={(v) => set("slack", "botToken", v)}
              hint="xoxb-... token from your Slack app (requires channels:history, users:read)"
              placeholder="xoxb-..."
            />
          </div>
          <Field
            label="User Token (optional)"
            type="password"
            value={str(sl.userToken)}
            onChange={(v) => set("slack", "userToken", v)}
            hint="xoxp-... for search access"
            placeholder="xoxp-..."
          />
          <Field
            label="Employee Slack User ID"
            value={str(sl.userId)}
            onChange={(v) => set("slack", "userId", v)}
            hint="The departing employee's Slack user ID"
            placeholder="U04ABC123"
          />
          <div className="sm:col-span-2">
            <TagsField
              label="Channel IDs"
              values={arr(sl.channelIds)}
              onChange={(v) => set("slack", "channelIds", v)}
              hint="Specific channel IDs or Slack channel URLs to scan"
              placeholder="C012AB3CD"
            />
          </div>
        </div>
      </SectionCard>

      {/* ── Notion ────────────────────────────────────────────── */}
      <SectionCard title="Notion" icon={FileText} color="bg-zinc-700">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field
              label="Integration Token"
              type="password"
              value={str(nt.token)}
              onChange={(v) => set("notion", "token", v)}
              hint="Internal integration token from notion.so/my-integrations"
              placeholder="secret_..."
            />
          </div>
          <div className="sm:col-span-2">
            <TagsField
              label="Page URLs"
              values={arr(nt.pageUrls)}
              onChange={(v) => set("notion", "pageUrls", v)}
              hint="Specific Notion page URLs to index"
              placeholder="https://notion.so/..."
            />
          </div>
          <div className="sm:col-span-2">
            <TagsField
              label="Database IDs"
              values={arr(nt.databaseIds)}
              onChange={(v) => set("notion", "databaseIds", v)}
              hint="Notion database IDs to scan"
              placeholder="abc123def456..."
            />
          </div>
        </div>
      </SectionCard>

      {/* ── Jira ──────────────────────────────────────────────── */}
      <SectionCard title="Jira" icon={Workflow} color="bg-blue-500">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field
              label="Jira Base URL"
              value={str(jr.baseUrl)}
              onChange={(v) => set("jira", "baseUrl", v)}
              placeholder="https://yourcompany.atlassian.net"
            />
          </div>
          <Field
            label="Email"
            type="email"
            value={str(jr.email)}
            onChange={(v) => set("jira", "email", v)}
            placeholder="you@company.com"
          />
          <Field
            label="API Token"
            type="password"
            value={str(jr.apiToken)}
            onChange={(v) => set("jira", "apiToken", v)}
            hint="Generated at id.atlassian.com/manage/api-tokens"
            placeholder="ATATT3x..."
          />
          <Field
            label="Employee Account ID"
            value={str(jr.accountId)}
            onChange={(v) => set("jira", "accountId", v)}
            hint="Departing employee's Jira account ID"
            placeholder="5b10a2844c..."
          />
          <div className="sm:col-span-2">
            <TagsField
              label="Project Keys"
              values={arr(jr.projectKeys)}
              onChange={(v) => set("jira", "projectKeys", v)}
              hint="Only issues in these projects for the configured employee are fetched; issue URLs are accepted"
              placeholder="INFRA or https://company.atlassian.net/browse/INFRA-123"
            />
          </div>
        </div>
      </SectionCard>

      {/* ── Meetings / Transcripts ────────────────────────────── */}
      <SectionCard title="Meetings & Transcripts" icon={Video} color="bg-rose-500">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <TagsField
              label="Transcript URLs"
              values={arr(mt.transcriptUrls)}
              onChange={(v) => set("meetings", "transcriptUrls", v)}
              hint="Direct links to existing transcripts or Google Docs; recordings are not transcribed"
              placeholder="https://docs.google.com/..."
            />
          </div>
          <Field
            label="Google Docs Token"
            type="password"
            value={str(mt.googleDocsToken)}
            onChange={(v) => set("meetings", "googleDocsToken", v)}
            hint="OAuth token for private Google Docs access"
            placeholder="ya29...."
          />
          <Field
            label="Zoom API Key"
            type="password"
            value={str(mt.zoomApiKey)}
            onChange={(v) => set("meetings", "zoomApiKey", v)}
            placeholder="zoom_api_key_..."
          />
          <Field
            label="Zoom API Secret"
            type="password"
            value={str(mt.zoomApiSecret)}
            onChange={(v) => set("meetings", "zoomApiSecret", v)}
            placeholder="zoom_secret_..."
          />
        </div>
      </SectionCard>

      {/* ── Linear ────────────────────────────────────────────── */}
      <SectionCard title="Linear" icon={LinkIcon} color="bg-indigo-500">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field
              label="API Key"
              type="password"
              value={str(ln.apiKey)}
              onChange={(v) => set("linear", "apiKey", v)}
              hint="Generate at linear.app/settings/api"
              placeholder="lin_api_..."
            />
          </div>
          <Field
            label="Employee Member ID"
            value={str(ln.memberId)}
            onChange={(v) => set("linear", "memberId", v)}
            hint="The departing employee's Linear member ID (UUID)"
            placeholder="member-uuid..."
          />
          <div className="sm:col-span-2">
            <TagsField
              label="Team IDs"
              values={arr(ln.teamIds)}
              onChange={(v) => set("linear", "teamIds", v)}
              hint="Linear team IDs to scope the issue search"
              placeholder="team-uuid..."
            />
          </div>
        </div>
      </SectionCard>

      {/* ── Confluence ────────────────────────────────────────── */}
      <SectionCard title="Confluence" icon={Database} color="bg-sky-600">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field
              label="Confluence Base URL"
              value={str(cf.baseUrl)}
              onChange={(v) => set("confluence", "baseUrl", v)}
              placeholder="https://yourcompany.atlassian.net/wiki"
            />
          </div>
          <Field
            label="Email"
            type="email"
            value={str(cf.email)}
            onChange={(v) => set("confluence", "email", v)}
            placeholder="you@company.com"
          />
          <Field
            label="API Token"
            type="password"
            value={str(cf.apiToken)}
            onChange={(v) => set("confluence", "apiToken", v)}
            placeholder="ATATT3x..."
          />
          <div className="sm:col-span-2">
            <TagsField
              label="Space Keys"
              values={arr(cf.spaceKeys)}
              onChange={(v) => set("confluence", "spaceKeys", v)}
              hint="Confluence space keys to index"
              placeholder="ENGINEERING"
            />
          </div>
        </div>
      </SectionCard>

      {/* ── Asana ─────────────────────────────────────────────── */}
      <SectionCard title="Asana" icon={Settings2} color="bg-pink-500">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field
              label="Personal Access Token"
              type="password"
              value={str(as.accessToken)}
              onChange={(v) => set("asana", "accessToken", v)}
              hint="Generate at app.asana.com/0/my-apps"
              placeholder="1/123456:abcdef..."
            />
          </div>
          <Field
            label="Workspace ID"
            value={str(as.workspaceId)}
            onChange={(v) => set("asana", "workspaceId", v)}
            placeholder="1234567890"
          />
          <Field
            label="Employee User GID"
            value={str(as.userId)}
            onChange={(v) => set("asana", "userId", v)}
            hint="The departing employee's Asana user GID"
            placeholder="987654321"
          />
        </div>
      </SectionCard>

      {/* ── Custom / Company-Specific ─────────────────────────── */}
      <CustomSection
        custom={cfg.custom}
        onChange={(v) => setCfg((prev) => ({ ...prev, custom: v }))}
      />

      {/* Save button at bottom */}
      <div className="flex justify-end pt-2 pb-8">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-blue-500 px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Saving…" : "Save All Settings"}
        </button>
      </div>
    </div>
  );
}
