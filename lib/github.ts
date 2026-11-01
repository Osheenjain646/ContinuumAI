/**
 * GitHub API Driver
 * Fetches recent user activity: commits, PRs, branches
 */

import type {
  GitHubCommit,
  GitHubPR,
  GitHubBranch,
  FetchGitHubActivityRequest,
} from "@/types";

const GITHUB_API_BASE = "https://api.github.com";

function githubHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const authToken = token || process.env.GITHUB_TOKEN;
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  return headers;
}

async function githubFetch<T>(
  url: string,
  token?: string
): Promise<T> {
  const res = await fetch(url, { headers: githubHeaders(token) });
  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(
      `GitHub API error ${res.status} for ${url}: ${errorBody}`
    );
  }
  return res.json() as Promise<T>;
}

// ─── Fetch user commits across all orgs ─────────────────────────────────────

export async function fetchUserCommits(
  req: FetchGitHubActivityRequest
): Promise<GitHubCommit[]> {
  const { username, token, daysBack = 30 } = req;
  const since = new Date(
    Date.now() - daysBack * 24 * 60 * 60 * 1000
  ).toISOString();

  // Search for commits by the user
  const searchUrl = `${GITHUB_API_BASE}/search/commits?q=author:${encodeURIComponent(username)}+author-date:>${since}&sort=author-date&order=desc&per_page=50`;

  try {
    const data = await githubFetch<{
      items: {
        sha: string;
        commit: {
          message: string;
          author: { name: string; date: string };
        };
        html_url: string;
        repository: { full_name: string };
        stats?: { additions: number; deletions: number; total: number };
      }[];
    }>(searchUrl, token);

    return data.items.map((item) => ({
      sha: item.sha.slice(0, 7),
      message: item.commit.message.split("\n")[0], // first line only
      author: item.commit.author.name,
      date: item.commit.author.date,
      url: item.html_url,
      repo: item.repository.full_name,
      additions: item.stats?.additions,
      deletions: item.stats?.deletions,
    }));
  } catch (err) {
    console.error("[github] fetchUserCommits error:", err);
    return [];
  }
}

// ─── Fetch open & recently merged PRs ────────────────────────────────────────

export async function fetchUserPullRequests(
  req: FetchGitHubActivityRequest
): Promise<GitHubPR[]> {
  const { username, token, daysBack = 60 } = req;
  const since = new Date(
    Date.now() - daysBack * 24 * 60 * 60 * 1000
  ).toISOString();

  const searchUrl = `${GITHUB_API_BASE}/search/issues?q=is:pr+author:${encodeURIComponent(username)}+updated:>${since}&sort=updated&order=desc&per_page=50`;

  try {
    const data = await githubFetch<{
      items: {
        id: number;
        number: number;
        title: string;
        state: "open" | "closed";
        html_url: string;
        created_at: string;
        updated_at: string;
        pull_request?: { merged_at: string | null };
        labels?: { name: string }[];
        assignees?: { login: string }[];
        requested_reviewers?: { login: string }[];
        body?: string;
        draft?: boolean;
        repository_url: string;
      }[];
    }>(searchUrl, token);

    return data.items.map((item) => {
      const repoMatch = item.repository_url.match(/repos\/(.+)$/);
      const repo = repoMatch ? repoMatch[1] : "unknown/unknown";
      let state: "open" | "closed" | "merged" = item.state;
      if (item.pull_request?.merged_at) state = "merged";

      return {
        id: item.id,
        number: item.number,
        title: item.title,
        state,
        url: item.html_url,
        repo,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        body: item.body ?? undefined,
        labels: item.labels?.map((l) => l.name) ?? [],
        assignees: item.assignees?.map((a) => a.login) ?? [],
        reviewers: item.requested_reviewers?.map((r) => r.login) ?? [],
        draft: item.draft ?? false,
      };
    });
  } catch (err) {
    console.error("[github] fetchUserPullRequests error:", err);
    return [];
  }
}

// ─── Fetch unmerged branches owned by user ──────────────────────────────────

export async function fetchUserBranches(
  req: FetchGitHubActivityRequest
): Promise<GitHubBranch[]> {
  const { username, token, org } = req;

  if (!org) return [];

  try {
    // List repos for the org and find branches associated with the user
    const reposUrl = `${GITHUB_API_BASE}/orgs/${encodeURIComponent(org)}/repos?per_page=50&sort=updated`;
    const repos = await githubFetch<{ name: string; full_name: string }[]>(
      reposUrl,
      token
    );

    const branchResults: GitHubBranch[] = [];

    for (const repo of repos.slice(0, 10)) {
      // Limit to 10 repos for rate limits
      try {
        const branchesUrl = `${GITHUB_API_BASE}/repos/${repo.full_name}/branches?per_page=100`;
        const branches = await githubFetch<
          { name: string; commit: { sha: string; url: string } }[]
        >(branchesUrl, token);

        for (const branch of branches) {
          if (
            branch.name.toLowerCase().includes(username.toLowerCase()) ||
            branch.name.startsWith("feature/") ||
            branch.name.startsWith("fix/")
          ) {
            branchResults.push({
              name: branch.name,
              repo: repo.full_name,
              lastCommit: branch.commit.sha.slice(0, 7),
              behindMain: 0,
              url: `https://github.com/${repo.full_name}/tree/${branch.name}`,
            });
          }
        }
      } catch {
        // Skip individual repo errors
      }
    }

    return branchResults;
  } catch (err) {
    console.error("[github] fetchUserBranches error:", err);
    return [];
  }
}

// ─── Aggregate all GitHub activity ───────────────────────────────────────────

export async function fetchAllGitHubActivity(req: FetchGitHubActivityRequest) {
  const [commits, pullRequests, branches] = await Promise.all([
    fetchUserCommits(req),
    fetchUserPullRequests(req),
    fetchUserBranches(req),
  ]);

  return { commits, pullRequests, branches };
}

