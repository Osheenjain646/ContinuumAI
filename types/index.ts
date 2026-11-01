// ─── Core Data Types for Continuum AI ───────────────────────────────────────

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
  duration: number; // minutes
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
  source: "google-docs" | "notion";
  lastModified: string;
  snippet: string;
  tags?: string[];
}

export interface SecretRiskAlert {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  type:
    | "hardcoded-pat"
    | "api-key"
    | "ssh-key"
    | "cloud-resource"
    | "unrotated-secret";
  description: string;
  location: string; // e.g. "github:org/repo#file.ts:42"
  sourceUrl?: string;
  detected: string; // ISO date
  recommendation: string;
}

export interface OwnedService {
  name: string;
  type:
    | "microservice"
    | "repository"
    | "api"
    | "script"
    | "pipeline"
    | "infra";
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
  source: "slack" | "github-pr" | "github-commit" | "notion" | "google-docs";
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
  openBugs: {
    title: string;
    url: string;
    severity: string;
    assignedTo?: string;
  }[];
  upcomingDeadlines: {
    title: string;
    dueDate: string;
    description: string;
  }[];
}

export interface ServiceOwnershipSection {
  ownedServices: OwnedService[];
  repositories: {
    name: string;
    url: string;
    primaryLanguage?: string;
    description?: string;
    isPrivate?: boolean;
  }[];
  deploymentPipelines: {
    name: string;
    description: string;
    environment: string;
    lastRun?: string;
    url?: string;
  }[];
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

// ─── Full Dossier ────────────────────────────────────────────────────────────

export interface HandoverDossier {
  id: string;
  departingEmployee: {
    name: string;
    email: string;
    githubUsername?: string;
    slackUserId?: string;
    role?: string;
    team?: string;
    lastActiveDate?: string;
    avatarUrl?: string;
  };
  generatedAt: string;
  lastUpdated: string;
  readinessScore: number; // 0-100
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
  vectorIndexId?: string;
}

// ─── Chat / RAG Types ────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: {
    type: "github" | "slack" | "meeting" | "doc";
    title: string;
    url: string;
    excerpt?: string;
  }[];
}

export interface ChatSession {
  id: string;
  dossierId: string;
  messages: ChatMessage[];
  createdAt: string;
}

// ─── API Request / Response Types ────────────────────────────────────────────

export interface FetchGitHubActivityRequest {
  username: string;
  token?: string;
  org?: string;
  daysBack?: number;
}

export interface FetchSlackActivityRequest {
  userId: string;
  token?: string;
  daysBack?: number;
  channels?: string[];
}

export interface SynthesizeRequest {
  githubData?: {
    commits: GitHubCommit[];
    pullRequests: GitHubPR[];
    branches: GitHubBranch[];
  };
  slackData?: {
    messages: SlackMessage[];
  };
  meetingData?: {
    transcripts: MeetingTranscript[];
  };
  docsData?: {
    pages: DocPage[];
  };
  employeeInfo: HandoverDossier["departingEmployee"];
}

export interface ChatRequest {
  dossierId: string;
  message: string;
  sessionId?: string;
  previousInteractionId?: string;
}

