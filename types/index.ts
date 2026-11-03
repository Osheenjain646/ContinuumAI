// ─── Auth & User Types ────────────────────────────────────────────────────────

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  avatarUrl?: string;
}

// ─── Integration Config Types ─────────────────────────────────────────────────

export interface GitHubIntegration {
  token?: string;            // PAT with repo, read:user
  username?: string;         // GitHub username of the departing employee
  orgOrRepoUrl?: string;     // e.g. https://github.com/acmecorp or a specific repo
  repos?: string[];          // specific repos to track: ["org/repo1", "org/repo2"]
}

export interface GitLabIntegration {
  token?: string;
  baseUrl?: string;          // defaults to https://gitlab.com
  username?: string;
  projectIds?: string[];     // numeric project IDs or "namespace/project"
}

export interface BitbucketIntegration {
  username?: string;
  accountId?: string;
  appPassword?: string;
  workspace?: string;
  repoSlugs?: string[];
}

export interface SlackIntegration {
  botToken?: string;         // xoxb-...
  userToken?: string;        // xoxp-... (for search)
  userId?: string;           // the departing employee's Slack user ID
  channelIds?: string[];     // specific channels to scan
}

export interface NotionIntegration {
  token?: string;            // Notion internal integration token
  pageUrls?: string[];       // specific Notion page URLs to index
  databaseIds?: string[];    // Notion database IDs
}

export interface JiraIntegration {
  baseUrl?: string;          // e.g. https://acmecorp.atlassian.net
  email?: string;
  apiToken?: string;
  accountId?: string;        // Jira account ID of departing employee
  projectKeys?: string[];    // e.g. ["INFRA", "PLAT"]
}

export interface MeetingIntegration {
  transcriptUrls?: string[]; // Direct URLs to transcript files / Google Docs
  googleDocsToken?: string;  // OAuth token for Google Docs
  zoomApiKey?: string;
  zoomApiSecret?: string;
}

export interface LinearIntegration {
  apiKey?: string;
  teamIds?: string[];
  memberId?: string;
}

export interface ConfluenceIntegration {
  baseUrl?: string;
  email?: string;
  apiToken?: string;
  spaceKeys?: string[];
}

export interface AsanaIntegration {
  accessToken?: string;
  workspaceId?: string;
  userId?: string;
}

export interface UserIntegrations {
  userId: string;
  updatedAt: string;
  // Integrations — all optional
  github?: GitHubIntegration;
  gitlab?: GitLabIntegration;
  bitbucket?: BitbucketIntegration;
  slack?: SlackIntegration;
  notion?: NotionIntegration;
  jira?: JiraIntegration;
  meetings?: MeetingIntegration;
  linear?: LinearIntegration;
  confluence?: ConfluenceIntegration;
  asana?: AsanaIntegration;
  // Custom/company-specific integrations as key-value pairs
  custom?: Record<string, { label: string; url?: string; token?: string; notes?: string }>;
}

// ─── Core Data Types (unchanged from previous) ───────────────────────────────

export interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
  repo: string;
  filesChanged?: number;
  additions?: number;
  deletions?: number;
}

export interface GitHubPR {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed" | "merged";
  url: string;
  repo: string;
  createdAt: string;
  updatedAt: string;
  reviewComments?: number;
  body?: string;
  labels?: string[];
  assignees?: string[];
  reviewers?: string[];
  draft?: boolean;
}

export interface GitHubBranch {
  name: string;
  repo: string;
  lastCommit: string;
  behindMain: number;
  url: string;
}

export interface SlackMessage {
  id: string;
  channel: string;
  channelId: string;
  text: string;
  timestamp: string;
  threadTs?: string;
  replyCount?: number;
  url: string;
  mentions?: string[];
  reactions?: { name: string; count: number }[];
}

export interface MeetingTranscript {
  id: string;
  title: string;
  date: string;
  duration: number;
  participants: string[];
  actionItems: string[];
  decisions: string[];
  summary: string;
  sourceUrl?: string;
}

export interface DocPage {
  id: string;
  title: string;
  url: string;
  source: "google-docs" | "notion" | "confluence" | "jira" | "linear" | "asana" | "custom";
  lastModified: string;
  snippet: string;
  tags?: string[];
}

export interface SecretRiskAlert {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  type: "hardcoded-pat" | "api-key" | "ssh-key" | "cloud-resource" | "unrotated-secret";
  description: string;
  location: string;
  sourceUrl?: string;
  detected: string;
  recommendation: string;
}

export interface OwnedService {
  name: string;
  type: "microservice" | "repository" | "api" | "script" | "pipeline" | "infra";
  description: string;
  repo?: string;
  deploymentUrl?: string;
  lastDeployed?: string;
  coOwners?: string[];
  tags?: string[];
}

export interface TechDebtItem {
  id: string;
  title: string;
  description: string;
  source: "slack" | "github-pr" | "github-commit" | "notion" | "google-docs" | "jira" | "gitlab" | "bitbucket" | "confluence" | "linear" | "asana" | "custom";
  sourceUrl: string;
  severity: "high" | "medium" | "low";
  category: "workaround" | "unwritten-rule" | "architectural-debt" | "edge-case";
  tags?: string[];
}

export interface CrossReference {
  slackThreadUrl?: string;
  githubPrUrl?: string;
  meetingDecision?: string;
  docUrl?: string;
  summary: string;
}

// ─── Dossier Sections ────────────────────────────────────────────────────────

export interface ActiveWorkSection {
  inFlightTasks: {
    title: string;
    description: string;
    status: "blocked" | "in-progress" | "needs-review" | "upcoming";
    priority: "urgent" | "high" | "medium" | "low";
    dueDate?: string;
    sourceUrl?: string;
    crossRefs?: CrossReference[];
  }[];
  pendingPRReviews: GitHubPR[];
  openBugs: { title: string; url: string; severity: string; assignedTo?: string }[];
  upcomingDeadlines: { title: string; dueDate: string; description: string }[];
}

export interface ServiceOwnershipSection {
  ownedServices: OwnedService[];
  repositories: { name: string; url: string; primaryLanguage?: string; description?: string; isPrivate?: boolean }[];
  deploymentPipelines: { name: string; description: string; environment: string; lastRun?: string; url?: string }[];
}

export interface ImplicitKnowledgeSection {
  techDebt: TechDebtItem[];
  workarounds: {
    title: string;
    description: string;
    affectedSystem: string;
    sourceUrl: string;
    crossRefs?: CrossReference[];
  }[];
  architecturalDecisions: {
    title: string;
    rationale: string;
    alternatives?: string;
    date: string;
    participants?: string[];
    sourceUrl?: string;
  }[];
}

export interface SecretAuditSection {
  alerts: SecretRiskAlert[];
  cloudResources: {
    name: string;
    type: string;
    provider: string;
    region?: string;
    linkedToUser: boolean;
    status: "active" | "idle" | "orphaned";
    url?: string;
  }[];
  accessRecommendations: string[];
}

// ─── Employee Info ────────────────────────────────────────────────────────────

export interface EmployeeInfo {
  name: string;
  email: string;
  githubUsername?: string;
  slackUserId?: string;
  role?: string;
  team?: string;
  lastActiveDate?: string;
  avatarUrl?: string;
}

// ─── Stored Dossier (persisted in MongoDB) ────────────────────────────────────

export interface StoredDossier {
  id: string;
  ownerId: string;       // User ID who created this dossier
  departingEmployee: EmployeeInfo;
  generatedAt: string;
  lastUpdated: string;
  status: "pending" | "fetching" | "synthesizing" | "complete" | "error";
  progress?: number;     // 0-100
  errorMessage?: string;
  fetchWarnings?: string[];
  readinessScore: number;
  readinessBreakdown: {
    activeWork: number;
    serviceOwnership: number;
    implicitKnowledge: number;
    securityAudit: number;
  };
  sections: {
    activeWork: ActiveWorkSection;
    serviceOwnership: ServiceOwnershipSection;
    implicitKnowledge: ImplicitKnowledgeSection;
    secretAudit: SecretAuditSection;
  };
  rawActivity: {
    commits: GitHubCommit[];
    pullRequests: GitHubPR[];
    slackMessages: SlackMessage[];
    meetingTranscripts: MeetingTranscript[];
    docs: DocPage[];
  };
  // User edits / overrides on top of AI synthesis
  userEdits?: {
    notes?: string;
    sectionOverrides?: Partial<StoredDossier["sections"]>;
    editedAt?: string;
    editedBy?: string;
  };
}

// ─── API Request/Response Types ───────────────────────────────────────────────

export interface CreateDossierRequest {
  departingEmployee: EmployeeInfo;
}

export interface FetchActivityRequest {
  dossierId: string;
  integrations: UserIntegrations;
  employee: EmployeeInfo;
}

export interface UpdateDossierRequest {
  notes?: string;
  sectionOverrides?: Partial<StoredDossier["sections"]>;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: {
    type: "github" | "slack" | "meeting" | "doc" | "jira" | "gitlab";
    title: string;
    url: string;
    excerpt?: string;
  }[];
}

// ─── Auth Session ─────────────────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

// ─── HandoverDossier alias ────────────────────────────────────────────────────
// StoredDossier is the canonical type; HandoverDossier is kept as an alias
// for backward compatibility with chat and dashboard components.
export type HandoverDossier = StoredDossier;

// ─── Chat Request ─────────────────────────────────────────────────────────────

export interface ChatRequest {
  dossierId?: string;
  message: string;
  previousInteractionId?: string;
}
