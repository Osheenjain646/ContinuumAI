/**
 * Multi-source activity fetcher
 * Reads from user-provided integration configs — only fetches from configured sources.
 * Fetches last 100 commits from each configured git platform.
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

const COMMIT_LIMIT = 100;

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
  if (!cfg?.token && !cfg?.username) return { commits: [], pullRequests: [], branches: [] };

  const username = cfg.username || employee.githubUsername || "";
  const token = cfg.token;

  // Commits via search
  const since = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
  const commitSearch = await ghFetch<{ items: Array<{
    sha: string; commit: { message: string; author: { name: string; date: string } };
    html_url: string; repository: { full_name: string };
  }> }>(
    `https://api.github.com/search/commits?q=author:${encodeURIComponent(username)}+author-date:>${since}&sort=author-date&order=desc&per_page=${COMMIT_LIMIT}`,
    token
  );

  const commits: GitHubCommit[] = (commitSearch?.items ?? []).map((c) => ({
    sha: c.sha.slice(0, 7),
    message: c.commit.message.split("\n")[0],
    author: c.commit.author.name,
    date: c.commit.author.date,
    url: c.html_url,
    repo: c.repository.full_name,
  }));

  // PRs via search
  const prSearch = await ghFetch<{ items: Array<{
    id: number; number: number; title: string; state: "open" | "closed";
    html_url: string; created_at: string; updated_at: string;
    pull_request?: { merged_at: string | null }; labels?: { name: string }[];
    repository_url: string; draft?: boolean;
  }> }>(
    `https://api.github.com/search/issues?q=is:pr+author:${encodeURIComponent(username)}&sort=updated&order=desc&per_page=50`,
    token
  );

  const pullRequests: GitHubPR[] = (prSearch?.items ?? []).map((pr) => {
    const repoMatch = pr.repository_url.match(/repos\/(.+)$/);
    const repo = repoMatch ? repoMatch[1] : "unknown";
    let state: "open" | "closed" | "merged" = pr.state;
    if (pr.pull_request?.merged_at) state = "merged";
    return {
      id: pr.id, number: pr.number, title: pr.title, state,
      url: pr.html_url, repo, createdAt: pr.created_at, updatedAt: pr.updated_at,
      labels: pr.labels?.map((l) => l.name) ?? [], draft: pr.draft ?? false,
    };
  });

  // Branches from specific repos if provided
  const branches: GitHubBranch[] = [];
  for (const repoFull of cfg.repos ?? []) {
    const branchList = await ghFetch<Array<{ name: string; commit: { sha: string } }>>(
      `https://api.github.com/repos/${repoFull}/branches?per_page=100`,
      token
    );
    for (const b of branchList ?? []) {
      branches.push({
        name: b.name, repo: repoFull,
        lastCommit: b.commit.sha.slice(0, 7), behindMain: 0,
        url: `https://github.com/${repoFull}/tree/${b.name}`,
      });
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

  const commits: GitHubCommit[] = [];
  const pullRequests: GitHubPR[] = [];

  for (const projectId of cfg.projectIds ?? []) {
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

  return { commits: commits.slice(0, COMMIT_LIMIT), pullRequests };
}

// ─── Bitbucket (REST API v2) ──────────────────────────────────────────────────

async function fetchBitbucketActivity(
  cfg: UserIntegrations["bitbucket"],
  employee: EmployeeInfo
): Promise<{ commits: GitHubCommit[]; pullRequests: GitHubPR[] }> {
  if (!cfg?.username || !cfg?.appPassword || !cfg?.workspace) return { commits: [], pullRequests: [] };

  const auth = Buffer.from(`${cfg.username}:${cfg.appPassword}`).toString("base64");
  const headers = { Authorization: `Basic ${auth}` };
  const accountId = employee.githubUsername || cfg.username;

  const commits: GitHubCommit[] = [];
  const pullRequests: GitHubPR[] = [];

  for (const slug of cfg.repoSlugs ?? []) {
    const repoFull = `${cfg.workspace}/${slug}`;
    try {
      const res = await fetch(
        `https://api.bitbucket.org/2.0/repositories/${repoFull}/commits?pagelen=${COMMIT_LIMIT}`,
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

    try {
      const res = await fetch(
        `https://api.bitbucket.org/2.0/repositories/${repoFull}/pullrequests?q=author.account_id="${accountId}"&pagelen=50`,
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

  return { commits: commits.slice(0, COMMIT_LIMIT), pullRequests };
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
  let channelIds: string[] = cfg.channelIds ?? [];
  if (channelIds.length === 0 && userId) {
    try {
      const res = await fetch(
        `https://slack.com/api/users.conversations?user=${userId}&types=public_channel&limit=20`,
        { headers }
      );
      const data = await res.json() as { ok: boolean; channels?: Array<{ id: string }> };
      if (data.ok) channelIds = data.channels?.map((c) => c.id) ?? [];
    } catch { /* skip */ }
  }

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
  if (!cfg?.token) return [];

  const headers = {
    Authorization: `Bearer ${cfg.token}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  };
  const docs: DocPage[] = [];

  // Search all pages (optionally filtered by provided pageUrls)
  try {
    const res = await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers,
      body: JSON.stringify({ filter: { value: "page", property: "object" }, page_size: 50 }),
    });
    if (res.ok) {
      const data = await res.json() as { results: Array<{ id: string; url: string; last_edited_time: string; properties?: { title?: { title?: Array<{ plain_text: string }> } } }> };
      for (const page of data.results) {
        const url = page.url;
        // If pageUrls provided, only include matching ones
        if (cfg.pageUrls && cfg.pageUrls.length > 0 && !cfg.pageUrls.some(u => url.includes(u.split("/").pop() ?? ""))) continue;
        const title = page.properties?.title?.title?.map(t => t.plain_text).join("") ?? "Untitled";
        docs.push({
          id: page.id, title, url, source: "notion",
          lastModified: page.last_edited_time,
          snippet: `Notion page: ${title}`,
        });
      }
    }
  } catch { /* skip */ }

  return docs;
}

// ─── Jira ─────────────────────────────────────────────────────────────────────

async function fetchJiraActivity(
  cfg: UserIntegrations["jira"],
  employee: EmployeeInfo
): Promise<DocPage[]> {
  if (!cfg?.baseUrl || !cfg?.email || !cfg?.apiToken) return [];

  const auth = Buffer.from(`${cfg.email}:${cfg.apiToken}`).toString("base64");
  const headers = { Authorization: `Basic ${auth}`, "Content-Type": "application/json" };
  const accountId = cfg.accountId || "";
  const projects = cfg.projectKeys ?? [];

  const projectFilter = projects.length > 0 ? `project in (${projects.map(p => `"${p}"`).join(",")}) AND ` : "";
  const assigneeFilter = accountId ? `assignee="${accountId}" OR reporter="${accountId}"` : "assignee is not EMPTY";
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

async function fetchMeetingTranscripts(
  cfg: UserIntegrations["meetings"]
): Promise<MeetingTranscript[]> {
  if (!cfg?.transcriptUrls || cfg.transcriptUrls.length === 0) return [];

  const transcripts: MeetingTranscript[] = [];
  for (const url of cfg.transcriptUrls) {
    try {
      // Try to fetch plain text transcript from the URL
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const text = await res.text();
      const lines = text.split("\n").filter(Boolean);

      transcripts.push({
        id: Buffer.from(url).toString("base64").slice(0, 16),
        title: lines[0]?.slice(0, 100) ?? url.split("/").pop() ?? "Meeting Transcript",
        date: new Date().toISOString(),
        duration: 0,
        participants: [],
        actionItems: lines.filter(l => /action|todo|task|follow.?up/i.test(l)).slice(0, 10),
        decisions: lines.filter(l => /decided|decision|agreed|resolved/i.test(l)).slice(0, 10),
        summary: lines.slice(0, 5).join(" ").slice(0, 500),
        sourceUrl: url,
      });
    } catch { /* skip */ }
  }

  return transcripts;
}

// ─── Linear ───────────────────────────────────────────────────────────────────

async function fetchLinearActivity(cfg: UserIntegrations["linear"]): Promise<DocPage[]> {
  if (!cfg?.apiKey) return [];

  const docs: DocPage[] = [];
  const memberId = cfg.memberId ?? "";
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

// ─── Main Orchestrator ────────────────────────────────────────────────────────

export interface FetchedActivity {
  commits: GitHubCommit[];
  pullRequests: GitHubPR[];
  slackMessages: SlackMessage[];
  docs: DocPage[];
  meetingTranscripts: MeetingTranscript[];
  sourcesUsed: string[];
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
  ] = await Promise.all([
    integrations.github ? fetchGitHubActivity(integrations.github, employee) : null,
    integrations.gitlab ? fetchGitLabActivity(integrations.gitlab, employee) : null,
    integrations.bitbucket ? fetchBitbucketActivity(integrations.bitbucket, employee) : null,
    integrations.slack ? fetchSlackActivity(integrations.slack, employee) : Promise.resolve([]),
    integrations.notion ? fetchNotionDocs(integrations.notion) : Promise.resolve([]),
    integrations.jira ? fetchJiraActivity(integrations.jira, employee) : Promise.resolve([]),
    integrations.meetings ? fetchMeetingTranscripts(integrations.meetings) : Promise.resolve([]),
    integrations.linear ? fetchLinearActivity(integrations.linear) : Promise.resolve([]),
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

  return {
    commits: allCommits.slice(0, COMMIT_LIMIT),
    pullRequests: allPRs,
    slackMessages,
    docs: allDocs,
    meetingTranscripts,
    sourcesUsed,
  };
}

