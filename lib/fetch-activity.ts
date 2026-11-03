/**
 * Multi-source activity fetcher
 * Reads from user-provided integration configs — only fetches from configured sources.
 * Fetches last 10 commits from each configured git platform.
 */

import type {
  UserIntegrations,
  EmployeeInfo,
  GitHubCommit,
  GitHubPR,
  GitHubBranch,
  SlackMessage,
  DocPage,
  MeetingTranscript,
} from "@/types";
import { isIP } from "node:net";

const COMMIT_LIMIT = 10;
type GitHubTarget = { repo?: string; org?: string };
const MAX_SOURCE_BYTES = 1_000_000;

function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (version === 6) {
    const normalized = address.toLowerCase();
    if (normalized.startsWith("::ffff:")) return true;
    return (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      /^fe[89ab]/.test(normalized) ||
      normalized.startsWith("ff")
    );
  }
  return false;
}

function parseExternalHttpsUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname === "metadata.google.internal" ||
      isPrivateAddress(hostname)
    ) return null;
    return url;
  } catch {
    return null;
  }
}

async function readLimitedText(response: Response): Promise<string> {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_SOURCE_BYTES) {
    throw new Error("Source document exceeds the 1 MB limit.");
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_SOURCE_BYTES) {
      await reader.cancel();
      throw new Error("Source document exceeds the 1 MB limit.");
    }
    chunks.push(value);
  }
  const content = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    content.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(content);
}

async function fetchExternalText(url: string, token?: string): Promise<string | null> {
  const safeUrl = parseExternalHttpsUrl(url);
  if (!safeUrl) return null;

  const res = await fetch(safeUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  const contentType = res.headers.get("content-type")?.toLowerCase() ?? "";
  if (!/(text\/|application\/(json|xml))/.test(contentType)) return null;
  return readLimitedText(res);
}

function parseGitHubTarget(value: string): GitHubTarget | null {
  const trimmed = value.trim().replace(/\.git$/i, "").replace(/\/+$/, "");
  let parts: string[];
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (url.hostname.toLowerCase() !== "github.com") return null;
      parts = url.pathname.split("/").filter(Boolean);
    } catch {
      return null;
    }
  } else {
    parts = trimmed.split("/").filter(Boolean);
  }

  if (parts.length === 1 && /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(parts[0])) {
    return { org: parts[0] };
  }
  if (
    parts.length === 2 &&
    /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(parts[0]) &&
    /^[A-Za-z0-9_.-]+$/.test(parts[1])
  ) {
    return { repo: `${parts[0]}/${parts[1]}` };
  }
  return null;
}

function parseNotionIdFromUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    if (
      url.protocol !== "https:" ||
      (hostname !== "notion.so" &&
        hostname !== "www.notion.so" &&
        !hostname.endsWith(".notion.site"))
    ) return null;
    const match = url.pathname.match(/[0-9a-f]{32}|[0-9a-f-]{36}/i);
    return match?.[0].replace(/-/g, "") ?? null;
  } catch {
    return null;
  }
}

// ─── GitHub (REST API) ────────────────────────────────────────────────────────

async function ghFetch<T>(url: string, token?: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

async function fetchGitHubActivity(
  cfg: UserIntegrations["github"],
  employee: EmployeeInfo
): Promise<{ commits: GitHubCommit[]; pullRequests: GitHubPR[]; branches: GitHubBranch[] }> {
  if (!cfg) return { commits: [], pullRequests: [], branches: [] };

  const username = cfg.username || employee.githubUsername || "";
  const token = cfg.token;
  const targets = [
    ...(cfg.repos ?? []).map(parseGitHubTarget),
    ...(cfg.orgOrRepoUrl ? [parseGitHubTarget(cfg.orgOrRepoUrl)] : []),
  ].filter((target): target is GitHubTarget => target !== null);
  const uniqueTargets = [...new Map(
    targets.map((target) => [target.repo ?? `org:${target.org}`, target])
  ).values()];
  if (uniqueTargets.length === 0) return { commits: [], pullRequests: [], branches: [] };

  const commits: GitHubCommit[] = [];
  const pullRequests: GitHubPR[] = [];
  const branches: GitHubBranch[] = [];
  for (const target of uniqueTargets) {
    const qualifier = target.repo ? `repo:${target.repo}` : `org:${target.org}`;
    const authorFilter = username ? ` author:${username}` : "";
    const commitSearch = await ghFetch<{ items: Array<{
      sha: string; commit: { message: string; author: { name: string; date: string } };
      html_url: string; repository: { full_name: string };
    }> }>(
      `https://api.github.com/search/commits?q=${encodeURIComponent(`${qualifier}${authorFilter}`)}&sort=author-date&order=desc&per_page=${COMMIT_LIMIT}`,
      token
    );
    commits.push(...(commitSearch?.items ?? []).map((commit) => ({
      sha: commit.sha.slice(0, 7),
      message: commit.commit.message.split("\n")[0],
      author: commit.commit.author.name,
      date: commit.commit.author.date,
      url: commit.html_url,
      repo: commit.repository.full_name,
    })));

    const prSearch = await ghFetch<{ items: Array<{
      id: number; number: number; title: string; state: "open" | "closed";
      html_url: string; created_at: string; updated_at: string;
      pull_request?: { merged_at: string | null }; labels?: { name: string }[];
      repository_url: string; draft?: boolean;
    }> }>(
      `https://api.github.com/search/issues?q=${encodeURIComponent(`is:pr ${qualifier}${authorFilter}`)}&sort=updated&order=desc&per_page=50`,
      token
    );
    pullRequests.push(...(prSearch?.items ?? []).map((pr): GitHubPR => {
      const repoMatch = pr.repository_url.match(/repos\/(.+)$/);
      const state: GitHubPR["state"] = pr.pull_request?.merged_at ? "merged" : pr.state;
      return {
        id: pr.id,
        number: pr.number,
        title: pr.title,
        state,
        url: pr.html_url,
        repo: repoMatch?.[1] ?? target.repo ?? target.org ?? "unknown",
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        labels: pr.labels?.map((label) => label.name) ?? [],
        draft: pr.draft ?? false,
      };
    }));

    if (target.repo) {
      const branchList = await ghFetch<Array<{ name: string; commit: { sha: string } }>>(
        `https://api.github.com/repos/${target.repo}/branches?per_page=100`,
        token
      );
      for (const branch of branchList ?? []) {
        branches.push({
          name: branch.name,
          repo: target.repo,
          lastCommit: branch.commit.sha.slice(0, 7),
          behindMain: 0,
          url: `https://github.com/${target.repo}/tree/${branch.name}`,
        });
      }
    }
  }

  return { commits, pullRequests, branches };
}

// ─── GitLab (REST API) ────────────────────────────────────────────────────────

async function fetchGitLabActivity(
  cfg: UserIntegrations["gitlab"],
  employee: EmployeeInfo
): Promise<{ commits: GitHubCommit[]; pullRequests: GitHubPR[] }> {
  if (!cfg?.token) return { commits: [], pullRequests: [] };

  const base = (cfg.baseUrl ?? "https://gitlab.com").replace(/\/$/, "");
  const headers = { "PRIVATE-TOKEN": cfg.token };
  const username = cfg.username || employee.githubUsername || "";
  const projectIds = (cfg.projectIds ?? []).map((value) => {
    try {
      const url = new URL(value);
      if (url.origin === new URL(base).origin) return url.pathname.replace(/^\/|\/$/g, "");
    } catch {
      return value.trim().replace(/^\/|\/$/g, "");
    }
    return "";
  }).filter(Boolean);

  const commits: GitHubCommit[] = [];
  const pullRequests: GitHubPR[] = [];

  for (const projectId of projectIds) {
    const encodedId = encodeURIComponent(projectId);

    // Commits by author
    try {
      const res = await fetch(
        `${base}/api/v4/projects/${encodedId}/repository/commits?author=${encodeURIComponent(username)}&per_page=${COMMIT_LIMIT}`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json() as Array<{ id: string; title: string; author_name: string; created_at: string; web_url: string }>;
        data.forEach((c) => commits.push({
          sha: c.id.slice(0, 7), message: c.title, author: c.author_name,
          date: c.created_at, url: c.web_url, repo: `gitlab:${projectId}`,
        }));
      }
    } catch { /* skip */ }

    // Merge Requests
    try {
      const res = await fetch(
        `${base}/api/v4/projects/${encodedId}/merge_requests?author_username=${encodeURIComponent(username)}&per_page=50`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json() as Array<{ id: number; iid: number; title: string; state: string; web_url: string; created_at: string; updated_at: string }>;
        data.forEach((mr) => pullRequests.push({
          id: mr.id, number: mr.iid, title: mr.title,
          state: mr.state === "merged" ? "merged" : mr.state === "opened" ? "open" : "closed",
          url: mr.web_url, repo: `gitlab:${projectId}`,
          createdAt: mr.created_at, updatedAt: mr.updated_at,
        }));
      }
    } catch { /* skip */ }
  }

  return { commits, pullRequests };
}

// ─── Bitbucket (REST API v2) ──────────────────────────────────────────────────

async function fetchBitbucketActivity(
  cfg: UserIntegrations["bitbucket"]
): Promise<{ commits: GitHubCommit[]; pullRequests: GitHubPR[] }> {
  if (
    !cfg?.username ||
    !cfg?.appPassword ||
    !cfg?.workspace ||
    !/^[A-Za-z0-9._-]+$/.test(cfg.workspace)
  ) return { commits: [], pullRequests: [] };

  const auth = Buffer.from(`${cfg.username}:${cfg.appPassword}`).toString("base64");
  const headers = { Authorization: `Basic ${auth}` };
  const accountId = cfg.accountId;

  const commits: GitHubCommit[] = [];
  const pullRequests: GitHubPR[] = [];

  for (const repoEntry of cfg.repoSlugs ?? []) {
    let slug = repoEntry.trim();
    try {
      const url = new URL(slug);
      if (url.hostname.toLowerCase() !== "bitbucket.org") continue;
      const pathParts = url.pathname.split("/").filter(Boolean);
      if (pathParts[0] !== cfg.workspace || !pathParts[1]) continue;
      slug = pathParts[1];
    } catch {
      slug = slug.replace(/^\/|\/$/g, "");
    }
    if (!slug || !/^[A-Za-z0-9._-]+$/.test(slug)) continue;
    const repoFull = `${cfg.workspace}/${slug}`;
    const encodedRepo = `${encodeURIComponent(cfg.workspace)}/${encodeURIComponent(slug)}`;
    try {
      const res = await fetch(
        `https://api.bitbucket.org/2.0/repositories/${encodedRepo}/commits?pagelen=${COMMIT_LIMIT}`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json() as { values: Array<{ hash: string; message: string; author: { raw: string }; date: string; links: { html: { href: string } } }> };
        data.values?.forEach((c) => commits.push({
          sha: c.hash.slice(0, 7), message: c.message.split("\n")[0],
          author: c.author.raw, date: c.date,
          url: c.links.html.href, repo: `bitbucket:${repoFull}`,
        }));
      }
    } catch { /* skip */ }

    if (!accountId) continue;

    try {
      const res = await fetch(
        `https://api.bitbucket.org/2.0/repositories/${encodedRepo}/pullrequests?q=author.account_id="${encodeURIComponent(accountId)}"&pagelen=50`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json() as { values: Array<{ id: number; title: string; state: string; links: { html: { href: string } }; created_on: string; updated_on: string }> };
        data.values?.forEach((pr) => pullRequests.push({
          id: pr.id, number: pr.id, title: pr.title,
          state: pr.state === "MERGED" ? "merged" : pr.state === "OPEN" ? "open" : "closed",
          url: pr.links.html.href, repo: `bitbucket:${repoFull}`,
          createdAt: pr.created_on, updatedAt: pr.updated_on,
        }));
      }
    } catch { /* skip */ }
  }

  return { commits, pullRequests };
}

// ─── Slack ────────────────────────────────────────────────────────────────────

async function fetchSlackActivity(
  cfg: UserIntegrations["slack"],
  employee: EmployeeInfo
): Promise<SlackMessage[]> {
  if (!cfg?.botToken) return [];

  const userId = cfg.userId || employee.slackUserId || "";
  const oldest = Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000);

  const headers = { Authorization: `Bearer ${cfg.botToken}` };
  const messages: SlackMessage[] = [];

  // Get channels to scan
  const channelIds = (cfg.channelIds ?? []).flatMap((value) => {
    let channelId = value.trim();
    try {
      const url = new URL(channelId);
      const hostname = url.hostname.toLowerCase();
      if (hostname !== "slack.com" && !hostname.endsWith(".slack.com")) return [];
      const match = url.pathname.match(/\/archives\/([A-Z0-9]+)/i);
      channelId = match?.[1] ?? "";
    } catch {
      // The settings also accept channel IDs without a URL.
    }
    return /^[A-Z0-9]{6,}$/i.test(channelId) ? [channelId] : [];
  });

  for (const channelId of channelIds.slice(0, 10)) {
    try {
      const res = await fetch(
        `https://slack.com/api/conversations.history?channel=${channelId}&oldest=${oldest}&limit=200`,
        { headers }
      );
      const data = await res.json() as { ok: boolean; messages?: Array<{ client_msg_id?: string; text: string; user?: string; ts: string; thread_ts?: string; reply_count?: number }> };
      if (!data.ok) continue;

      const filtered = data.messages?.filter(
        (m) => m.user === userId || (userId && m.text?.includes(`<@${userId}>`))
      ) ?? [];

      filtered.forEach((m) => messages.push({
        id: m.client_msg_id || m.ts,
        channel: channelId, channelId,
        text: m.text, timestamp: new Date(parseFloat(m.ts) * 1000).toISOString(),
        threadTs: m.thread_ts, replyCount: m.reply_count,
        url: `https://slack.com/archives/${channelId}/p${m.ts.replace(".", "")}`,
      }));
    } catch { /* skip */ }
  }

  return messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// ─── Notion ───────────────────────────────────────────────────────────────────

async function fetchNotionDocs(cfg: UserIntegrations["notion"]): Promise<DocPage[]> {
  if (!cfg?.token || (!cfg.pageUrls?.length && !cfg.databaseIds?.length)) return [];

  const headers = {
    Authorization: `Bearer ${cfg.token}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  };
  const docs: DocPage[] = [];

  const pageIds = (cfg.pageUrls ?? []).flatMap((pageUrl) => {
    const id = parseNotionIdFromUrl(pageUrl);
    return id ? [id] : [];
  });
  const databaseIds = (cfg.databaseIds ?? []).flatMap((databaseId) => {
    const linkedId = parseNotionIdFromUrl(databaseId);
    const id = linkedId ?? databaseId.replace(/-/g, "").trim();
    return /^[0-9a-f]{32}$/i.test(id) ? [id] : [];
  });
  const pages = new Map<string, {
    id: string;
    url: string;
    last_edited_time: string;
    properties?: Record<string, { title?: Array<{ plain_text: string }> }>;
  }>();

  const pageUrl = (pageId: string) => `https://api.notion.com/v1/pages/${encodeURIComponent(pageId)}`;
  const addPage = (page: {
    id: string;
    url: string;
    last_edited_time: string;
    properties?: Record<string, { title?: Array<{ plain_text: string }> }>;
  }) => pages.set(page.id, page);

  for (const pageId of pageIds) {
    try {
      const res = await fetch(pageUrl(pageId), { headers, signal: AbortSignal.timeout(10000) });
      if (res.ok) addPage(await res.json());
    } catch {
      continue;
    }
  }

  for (const id of databaseIds) {
    if (!/^[0-9a-f]{32}$/i.test(id)) continue;
    try {
      const res = await fetch(`https://api.notion.com/v1/databases/${encodeURIComponent(id)}/query`, {
        method: "POST",
        headers,
        body: JSON.stringify({ page_size: 100 }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;
      const data = await res.json() as { results?: Array<{
        id: string;
        url: string;
        last_edited_time: string;
        properties?: Record<string, { title?: Array<{ plain_text: string }> }>;
      }> };
      for (const page of data.results ?? []) addPage(page);
    } catch {
      continue;
    }
  }

  for (const page of pages.values()) {
    const title = Object.values(page.properties ?? [])
      .find((property) => property.title)?.title?.map((item) => item.plain_text).join("") ?? "Untitled";
    let snippet = `Notion page: ${title}`;
    try {
      const res = await fetch(
        `https://api.notion.com/v1/blocks/${encodeURIComponent(page.id)}/children?page_size=100`,
        { headers, signal: AbortSignal.timeout(10000) }
      );
      if (res.ok) {
        const data = await res.json() as {
          results?: Array<Record<string, { rich_text?: Array<{ plain_text: string }> }>>;
        };
        const text = (data.results ?? []).flatMap((block) =>
          Object.values(block).flatMap((value) =>
            value.rich_text?.map((item) => item.plain_text) ?? []
          )
        ).join(" ");
        if (text) snippet = text.slice(0, 500);
      }
    } catch {
      // Keep the page metadata when its content cannot be read.
    }
    docs.push({
      id: page.id,
      title,
      url: page.url,
      source: "notion",
      lastModified: page.last_edited_time,
      snippet,
    });
  }

  return docs;
}

// ─── Jira ─────────────────────────────────────────────────────────────────────

async function fetchJiraActivity(
  cfg: UserIntegrations["jira"]
): Promise<DocPage[]> {
  if (
    !cfg?.baseUrl ||
    !cfg.email ||
    !cfg.apiToken ||
    !cfg.accountId ||
    !cfg.projectKeys?.length
  ) return [];

  const auth = Buffer.from(`${cfg.email}:${cfg.apiToken}`).toString("base64");
  const headers = { Authorization: `Basic ${auth}`, "Content-Type": "application/json" };
  const accountId = cfg.accountId.replace(/["\\]/g, "");
  const projects = cfg.projectKeys
    .map((value) => {
      const issueKey = value.match(/\/browse\/([A-Za-z][A-Za-z0-9_]*)-\d+/i)?.[1];
      return (issueKey ?? value).trim();
    })
    .filter((key) => /^[A-Za-z][A-Za-z0-9_]*$/.test(key));
  if (!accountId || projects.length === 0) return [];

  const projectFilter = `project in (${projects.map((project) => `"${project}"`).join(",")}) AND `;
  const assigneeFilter = `assignee="${accountId}" OR reporter="${accountId}"`;
  const jql = `${projectFilter}(${assigneeFilter}) ORDER BY updated DESC`;

  const docs: DocPage[] = [];
  try {
    const res = await fetch(
      `${cfg.baseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=50&fields=summary,status,assignee,reporter,updated,description`,
      { headers }
    );
    if (res.ok) {
      const data = await res.json() as { issues: Array<{ id: string; key: string; self: string; fields: { summary: string; updated: string; status?: { name: string }; description?: { content?: Array<{ content?: Array<{ text?: string }> }> } } }> };
      for (const issue of data.issues ?? []) {
        const snippet = issue.fields.description?.content?.[0]?.content?.[0]?.text ?? `[${issue.fields.status?.name}]`;
        docs.push({
          id: issue.id,
          title: `[${issue.key}] ${issue.fields.summary}`,
          url: `${cfg.baseUrl}/browse/${issue.key}`,
          source: "jira",
          lastModified: issue.fields.updated,
          snippet: snippet.slice(0, 200),
        });
      }
    }
  } catch { /* skip */ }

  return docs;
}

// ─── Meeting Transcript URLs ───────────────────────────────────────────────────

function collectDocumentText(value: unknown): string {
  if (Array.isArray(value)) return value.map(collectDocumentText).join("");
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  if (record.textRun && typeof record.textRun === "object") {
    const text = (record.textRun as Record<string, unknown>).content;
    return typeof text === "string" ? text : "";
  }
  return Object.values(record).map(collectDocumentText).join("");
}

async function fetchMeetingTranscripts(
  cfg: UserIntegrations["meetings"]
): Promise<MeetingTranscript[]> {
  if (!cfg?.transcriptUrls || cfg.transcriptUrls.length === 0) return [];

  const transcripts: MeetingTranscript[] = [];
  for (const sourceUrl of cfg.transcriptUrls) {
    try {
      const url = parseExternalHttpsUrl(sourceUrl);
      if (!url) continue;

      let text: string | null;
      if (url.hostname.toLowerCase() === "docs.google.com") {
        const documentId = url.pathname.match(/\/document\/d\/([^/]+)/)?.[1];
        if (!documentId || !cfg.googleDocsToken) continue;
        const response = await fetch(
          `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}`,
          {
            headers: { Authorization: `Bearer ${cfg.googleDocsToken}` },
            signal: AbortSignal.timeout(10000),
          }
        );
        if (!response.ok) continue;
        const document = await response.json() as { body?: { content?: unknown } };
        text = collectDocumentText(document.body?.content);
      } else {
        text = await fetchExternalText(sourceUrl);
        if (text) {
          text = text
            .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
            .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/gi, " ")
            .replace(/&amp;/gi, "&")
            .replace(/&lt;/gi, "<")
            .replace(/&gt;/gi, ">");
        }
      }
      if (!text) continue;
      const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

      transcripts.push({
        id: Buffer.from(sourceUrl).toString("base64").slice(0, 16),
        title: lines[0]?.slice(0, 100) ?? url.pathname.split("/").pop() ?? "Meeting Transcript",
        date: new Date().toISOString(),
        duration: 0,
        participants: [],
        actionItems: lines.filter(l => /action|todo|task|follow.?up/i.test(l)).slice(0, 10),
        decisions: lines.filter(l => /decided|decision|agreed|resolved/i.test(l)).slice(0, 10),
        summary: lines.slice(0, 5).join(" ").slice(0, 500),
        sourceUrl,
      });
    } catch {
      continue;
    }
  }

  return transcripts;
}

// ─── Linear ───────────────────────────────────────────────────────────────────

async function fetchLinearActivity(cfg: UserIntegrations["linear"]): Promise<DocPage[]> {
  if (!cfg?.apiKey || !cfg.memberId) return [];

  const docs: DocPage[] = [];
  const memberId = cfg.memberId;
  const teamFilter = cfg.teamIds?.length ? `, teamIds: ${JSON.stringify(cfg.teamIds)}` : "";

  const query = `{
    issues(filter: { assignee: { id: { eq: "${memberId}" } }${teamFilter} }, first: 50, orderBy: updatedAt) {
      nodes { id title url state { name } updatedAt description }
    }
  }`;

  try {
    const res = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: { Authorization: cfg.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    if (res.ok) {
      const data = await res.json() as { data?: { issues?: { nodes?: Array<{ id: string; title: string; url: string; state?: { name: string }; updatedAt: string; description?: string }> } } };
      for (const issue of data.data?.issues?.nodes ?? []) {
        docs.push({
          id: issue.id, title: issue.title, url: issue.url, source: "linear",
          lastModified: issue.updatedAt,
          snippet: (issue.description ?? `[${issue.state?.name}]`).slice(0, 200),
        });
      }
    }
  } catch { /* skip */ }

  return docs;
}

// ─── Confluence ───────────────────────────────────────────────────────────────

async function fetchConfluenceDocs(
  cfg: UserIntegrations["confluence"]
): Promise<DocPage[]> {
  if (!cfg?.baseUrl || !cfg.email || !cfg.apiToken || !cfg.spaceKeys?.length) return [];
  let baseUrl: URL;
  try {
    baseUrl = new URL(cfg.baseUrl);
  } catch {
    return [];
  }
  if (baseUrl.protocol !== "https:" || baseUrl.username || baseUrl.password) return [];

  const headers = {
    Authorization: `Basic ${Buffer.from(`${cfg.email}:${cfg.apiToken}`).toString("base64")}`,
    Accept: "application/json",
  };
  const docs: DocPage[] = [];
  for (const spaceKey of new Set(cfg.spaceKeys.map((key) => key.trim()).filter((key) => /^[A-Za-z0-9_-]+$/.test(key)))) {
    try {
      const url = new URL(
        `${baseUrl.toString().replace(/\/+$/, "")}/rest/api/content`
      );
      url.searchParams.set("spaceKey", spaceKey);
      url.searchParams.set("limit", "50");
      url.searchParams.set("expand", "body.storage,version");
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
      if (!response.ok) continue;
      const data = await response.json() as { results?: Array<{
        id: string;
        title: string;
        _links?: { webui?: string };
        version?: { when?: string };
        body?: { storage?: { value?: string } };
      }> };
      for (const page of data.results ?? []) {
        const snippet = (page.body?.storage?.value ?? "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 500);
        docs.push({
          id: page.id,
          title: page.title,
          url: page._links?.webui ? new URL(page._links.webui, baseUrl).toString() : baseUrl.toString(),
          source: "confluence",
          lastModified: page.version?.when ?? new Date().toISOString(),
          snippet,
        });
      }
    } catch {
      continue;
    }
  }
  return docs;
}

// ─── Asana ────────────────────────────────────────────────────────────────────

async function fetchAsanaTasks(cfg: UserIntegrations["asana"]): Promise<DocPage[]> {
  if (!cfg?.accessToken || !cfg.workspaceId || !cfg.userId) return [];
  const url = new URL("https://app.asana.com/api/1.0/tasks");
  url.searchParams.set("assignee", cfg.userId);
  url.searchParams.set("workspace", cfg.workspaceId);
  url.searchParams.set("limit", "100");
  url.searchParams.set("opt_fields", "name,permalink_url,modified_at,notes");
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${cfg.accessToken}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return [];
    const data = await response.json() as { data?: Array<{
      gid: string;
      name: string;
      permalink_url: string;
      modified_at: string;
      notes?: string;
    }> };
    return (data.data ?? []).map((task) => ({
      id: task.gid,
      title: task.name,
      url: task.permalink_url,
      source: "asana",
      lastModified: task.modified_at,
      snippet: (task.notes ?? "").slice(0, 500),
    }));
  } catch {
    return [];
  }
}

// ─── Custom company-specific URLs ─────────────────────────────────────────────

async function fetchCustomDocs(
  integrations: UserIntegrations["custom"]
): Promise<DocPage[]> {
  const docs: DocPage[] = [];
  for (const [id, integration] of Object.entries(integrations ?? {})) {
    if (!integration.url) continue;
    try {
      const body = await fetchExternalText(integration.url, integration.token);
      if (!body) continue;
      const snippet = body
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 500);
      docs.push({
        id,
        title: integration.label || "Custom source",
        url: integration.url,
        source: "custom",
        lastModified: new Date().toISOString(),
        snippet,
      });
    } catch {
      continue;
    }
  }
  return docs;
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────

export interface FetchedActivity {
  commits: GitHubCommit[];
  pullRequests: GitHubPR[];
  slackMessages: SlackMessage[];
  docs: DocPage[];
  meetingTranscripts: MeetingTranscript[];
  sourcesUsed: string[];
  warnings: string[];
}

export async function fetchAllActivity(
  integrations: UserIntegrations,
  employee: EmployeeInfo
): Promise<FetchedActivity> {
  const sourcesUsed: string[] = [];
  const allCommits: GitHubCommit[] = [];
  const allPRs: GitHubPR[] = [];
  const allDocs: DocPage[] = [];

  // Run all fetches in parallel
  const [
    ghData,
    glData,
    bbData,
    slackMessages,
    notionDocs,
    jiraDocs,
    meetingTranscripts,
    linearDocs,
    confluenceDocs,
    asanaDocs,
    customDocs,
  ] = await Promise.all([
    integrations.github ? fetchGitHubActivity(integrations.github, employee) : null,
    integrations.gitlab ? fetchGitLabActivity(integrations.gitlab, employee) : null,
    integrations.bitbucket ? fetchBitbucketActivity(integrations.bitbucket) : null,
    integrations.slack ? fetchSlackActivity(integrations.slack, employee) : Promise.resolve([]),
    integrations.notion ? fetchNotionDocs(integrations.notion) : Promise.resolve([]),
    integrations.jira ? fetchJiraActivity(integrations.jira) : Promise.resolve([]),
    integrations.meetings ? fetchMeetingTranscripts(integrations.meetings) : Promise.resolve([]),
    integrations.linear ? fetchLinearActivity(integrations.linear) : Promise.resolve([]),
    integrations.confluence ? fetchConfluenceDocs(integrations.confluence) : Promise.resolve([]),
    integrations.asana ? fetchAsanaTasks(integrations.asana) : Promise.resolve([]),
    integrations.custom ? fetchCustomDocs(integrations.custom) : Promise.resolve([]),
  ]);

  if (ghData?.commits.length) { allCommits.push(...ghData.commits); sourcesUsed.push("GitHub"); }
  if (glData?.commits.length) { allCommits.push(...glData.commits); sourcesUsed.push("GitLab"); }
  if (bbData?.commits.length) { allCommits.push(...bbData.commits); sourcesUsed.push("Bitbucket"); }
  if (ghData?.pullRequests.length) allPRs.push(...ghData.pullRequests);
  if (glData?.pullRequests.length) allPRs.push(...glData.pullRequests);
  if (bbData?.pullRequests.length) allPRs.push(...bbData.pullRequests);
  if (slackMessages.length) sourcesUsed.push("Slack");
  if (notionDocs.length) { allDocs.push(...notionDocs); sourcesUsed.push("Notion"); }
  if (jiraDocs.length) { allDocs.push(...jiraDocs); sourcesUsed.push("Jira"); }
  if (meetingTranscripts.length) sourcesUsed.push("Meetings");
  if (linearDocs.length) { allDocs.push(...linearDocs); sourcesUsed.push("Linear"); }
  if (confluenceDocs.length) { allDocs.push(...confluenceDocs); sourcesUsed.push("Confluence"); }
  if (asanaDocs.length) { allDocs.push(...asanaDocs); sourcesUsed.push("Asana"); }
  if (customDocs.length) { allDocs.push(...customDocs); sourcesUsed.push("Custom"); }

  const sourceResults = [
    {
      name: "GitHub",
      configured: Boolean(integrations.github?.orgOrRepoUrl || integrations.github?.repos?.length),
      hasData: Boolean(ghData?.commits.length || ghData?.pullRequests.length || ghData?.branches.length),
    },
    {
      name: "GitLab",
      configured: Boolean(integrations.gitlab?.projectIds?.length),
      hasData: Boolean(glData?.commits.length || glData?.pullRequests.length),
    },
    {
      name: "Bitbucket",
      configured: Boolean(integrations.bitbucket?.repoSlugs?.length),
      hasData: Boolean(bbData?.commits.length || bbData?.pullRequests.length),
    },
    {
      name: "Slack",
      configured: Boolean(integrations.slack?.channelIds?.length),
      hasData: slackMessages.length > 0,
    },
    {
      name: "Notion",
      configured: Boolean(integrations.notion?.pageUrls?.length || integrations.notion?.databaseIds?.length),
      hasData: notionDocs.length > 0,
    },
    {
      name: "Jira",
      configured: Boolean(integrations.jira?.projectKeys?.length),
      hasData: jiraDocs.length > 0,
    },
    {
      name: "Meetings",
      configured: Boolean(integrations.meetings?.transcriptUrls?.length),
      hasData: meetingTranscripts.length > 0,
    },
    {
      name: "Linear",
      configured: Boolean(integrations.linear?.memberId || integrations.linear?.teamIds?.length),
      hasData: linearDocs.length > 0,
    },
    {
      name: "Confluence",
      configured: Boolean(integrations.confluence?.spaceKeys?.length),
      hasData: confluenceDocs.length > 0,
    },
    {
      name: "Asana",
      configured: Boolean(integrations.asana?.workspaceId || integrations.asana?.userId),
      hasData: asanaDocs.length > 0,
    },
    {
      name: "Custom sources",
      configured: Object.values(integrations.custom ?? {}).some((integration) => Boolean(integration.url)),
      hasData: customDocs.length > 0,
    },
  ];
  const warnings = sourceResults
    .filter((source) => source.configured && !source.hasData)
    .map((source) => `No activity was returned from ${source.name}. Check its credentials and configured targets if this is unexpected.`);

  return {
    commits: allCommits,
    pullRequests: allPRs,
    slackMessages,
    docs: allDocs,
    meetingTranscripts,
    sourcesUsed,
    warnings,
  };
}
