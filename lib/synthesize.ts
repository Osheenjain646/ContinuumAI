/**
 * Updated synthesize.ts — uses new StoredDossier types
 */

import { GoogleGenAI } from "@google/genai";
import type {
  ActiveWorkSection,
  ServiceOwnershipSection,
  ImplicitKnowledgeSection,
  SecretAuditSection,
  GitHubCommit,
  GitHubPR,
  GitHubBranch,
  SlackMessage,
  MeetingTranscript,
  DocPage,
  EmployeeInfo,
} from "@/types";

const client = new GoogleGenAI({});
const MODEL = "gemini-3.8-flash";

export interface SynthesizeRequest {
  githubData?: { commits: GitHubCommit[]; pullRequests: GitHubPR[]; branches: GitHubBranch[] };
  slackData?: { messages: SlackMessage[] };
  meetingData?: { transcripts: MeetingTranscript[] };
  docsData?: { pages: DocPage[] };
  employeeInfo: EmployeeInfo;
}

const NOISE_FILTER_SYSTEM = `You are an expert software engineering analyst specializing in knowledge transfer and offboarding.
Analyze developer activity and extract only HIGH-SIGNAL information.
FILTER OUT: Minor typo fixes, formatting commits, casual chat, bot messages.
KEEP: Architecture decisions, bug root causes, workarounds, deployment procedures, security-related items, handoff notes.
Always respond with valid JSON only. No markdown code blocks, no explanation text.`;

async function llmJson<T>(prompt: string, fallback: T): Promise<T> {
  try {
    const interaction = await client.interactions.create({ model: MODEL, input: prompt, store: false });
    const text = (interaction.output_text ?? "{}").replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

async function synthesizeActiveWork(req: SynthesizeRequest): Promise<ActiveWorkSection> {
  const rawData = {
    commits: req.githubData?.commits?.slice(0, 30) ?? [],
    openPRs: req.githubData?.pullRequests?.filter((pr) => pr.state === "open") ?? [],
    slackMessages: req.slackData?.messages?.slice(0, 30) ?? [],
    meetingActionItems: req.meetingData?.transcripts?.flatMap((t) => t.actionItems) ?? [],
    jiraIssues: req.docsData?.pages?.filter((p) => p.source === "jira") ?? [],
    linearIssues: req.docsData?.pages?.filter((p) => p.source === "linear") ?? [],
    asanaTasks: req.docsData?.pages?.filter((p) => p.source === "asana") ?? [],
    confluencePages: req.docsData?.pages?.filter((p) => p.source === "confluence") ?? [],
  };

  return llmJson<ActiveWorkSection>(`${NOISE_FILTER_SYSTEM}

Analyze this developer activity for ${req.employeeInfo.name} and extract active work and blockers.
RAW DATA: ${JSON.stringify(rawData, null, 2)}

Return JSON matching:
{
  inFlightTasks: Array<{ title: string; description: string; status: "blocked"|"in-progress"|"needs-review"|"upcoming"; priority: "urgent"|"high"|"medium"|"low"; dueDate?: string; sourceUrl?: string; crossRefs?: Array<{ slackThreadUrl?: string; githubPrUrl?: string; meetingDecision?: string; docUrl?: string; summary: string }> }>;
  pendingPRReviews: Array<{ id: number; number: number; title: string; state: "open"; url: string; repo: string; createdAt: string; updatedAt: string }>;
  openBugs: Array<{ title: string; url: string; severity: string; assignedTo?: string }>;
  upcomingDeadlines: Array<{ title: string; dueDate: string; description: string }>;
}`, {
    inFlightTasks: [],
    pendingPRReviews: req.githubData?.pullRequests?.filter(pr => pr.state === "open") ?? [],
    openBugs: [],
    upcomingDeadlines: [],
  });
}

async function synthesizeServiceOwnership(req: SynthesizeRequest): Promise<ServiceOwnershipSection> {
  const rawData = {
    commits: req.githubData?.commits?.slice(0, 30) ?? [],
    prs: req.githubData?.pullRequests ?? [],
    docs: req.docsData?.pages ?? [],
    slackMessages: req.slackData?.messages?.slice(0, 20) ?? [],
  };

  return llmJson<ServiceOwnershipSection>(`${NOISE_FILTER_SYSTEM}

Identify ALL services, repositories, APIs, scripts, and deployment pipelines that ${req.employeeInfo.name} owns.
RAW DATA: ${JSON.stringify(rawData, null, 2)}

Return JSON matching:
{
  ownedServices: Array<{ name: string; type: "microservice"|"repository"|"api"|"script"|"pipeline"|"infra"; description: string; repo?: string; deploymentUrl?: string; lastDeployed?: string; coOwners?: string[]; tags?: string[] }>;
  repositories: Array<{ name: string; url: string; primaryLanguage?: string; description?: string; isPrivate?: boolean }>;
  deploymentPipelines: Array<{ name: string; description: string; environment: string; lastRun?: string; url?: string }>;
}`, { ownedServices: [], repositories: [], deploymentPipelines: [] });
}

async function synthesizeImplicitKnowledge(req: SynthesizeRequest): Promise<ImplicitKnowledgeSection> {
  const rawData = {
    commits: req.githubData?.commits ?? [],
    slackMessages: req.slackData?.messages ?? [],
    meetingDecisions: req.meetingData?.transcripts?.flatMap((t) => t.decisions) ?? [],
    docs: req.docsData?.pages ?? [],
  };

  return llmJson<ImplicitKnowledgeSection>(`${NOISE_FILTER_SYSTEM}

Surface ALL implicit knowledge, tech debt, workarounds, and architectural decisions from ${req.employeeInfo.name}'s activity.
RAW DATA: ${JSON.stringify(rawData, null, 2)}

Return JSON matching:
{
  techDebt: Array<{ id: string; title: string; description: string; source: "slack"|"github-pr"|"github-commit"|"notion"|"google-docs"|"jira"|"gitlab"|"bitbucket"|"confluence"|"linear"|"asana"|"custom"; sourceUrl: string; severity: "high"|"medium"|"low"; category: "workaround"|"unwritten-rule"|"architectural-debt"|"edge-case"; tags?: string[] }>;
  workarounds: Array<{ title: string; description: string; affectedSystem: string; sourceUrl: string; crossRefs?: Array<{ slackThreadUrl?: string; githubPrUrl?: string; summary: string }> }>;
  architecturalDecisions: Array<{ title: string; rationale: string; alternatives?: string; date: string; participants?: string[]; sourceUrl?: string }>;
}`, { techDebt: [], workarounds: [], architecturalDecisions: [] });
}

async function synthesizeSecretAudit(req: SynthesizeRequest): Promise<SecretAuditSection> {
  const rawData = {
    commits: req.githubData?.commits ?? [],
    slackMessages: req.slackData?.messages?.filter((m) =>
      /key|token|secret|password|credential|auth|api[_-]?key|pat|ssh/i.test(m.text)
    ) ?? [],
    docs: req.docsData?.pages ?? [],
  };

  return llmJson<SecretAuditSection>(`${NOISE_FILTER_SYSTEM}

SECURITY AUDIT: Identify ALL potential security risks related to ${req.employeeInfo.name}'s departure.
RAW DATA: ${JSON.stringify(rawData, null, 2)}

Return JSON matching:
{
  alerts: Array<{ id: string; severity: "critical"|"high"|"medium"|"low"; type: "hardcoded-pat"|"api-key"|"ssh-key"|"cloud-resource"|"unrotated-secret"; description: string; location: string; sourceUrl?: string; detected: string; recommendation: string }>;
  cloudResources: Array<{ name: string; type: string; provider: string; region?: string; linkedToUser: boolean; status: "active"|"idle"|"orphaned"; url?: string }>;
  accessRecommendations: string[];
}`, { alerts: [], cloudResources: [], accessRecommendations: [] });
}

function calculateReadinessScore(sections: {
  activeWork: ActiveWorkSection;
  serviceOwnership: ServiceOwnershipSection;
  implicitKnowledge: ImplicitKnowledgeSection;
  secretAudit: SecretAuditSection;
}) {
  const blockedTasks = sections.activeWork.inFlightTasks.filter(t => t.status === "blocked").length;
  const pendingPRs = sections.activeWork.pendingPRReviews.length;
  const activeWorkScore = Math.max(0, 100 - blockedTasks * 15 - pendingPRs * 5);

  const servicesWithCoOwners = sections.serviceOwnership.ownedServices.filter(s => (s.coOwners?.length ?? 0) > 0).length;
  const totalServices = Math.max(sections.serviceOwnership.ownedServices.length, 1);
  const serviceOwnershipScore = Math.round((servicesWithCoOwners / totalServices) * 100);

  const highSeverityDebt = sections.implicitKnowledge.techDebt.filter(d => d.severity === "high").length;
  const implicitKnowledgeScore = Math.max(0, 100 - highSeverityDebt * 20);

  const criticalAlerts = sections.secretAudit.alerts.filter(a => a.severity === "critical").length;
  const highAlerts = sections.secretAudit.alerts.filter(a => a.severity === "high").length;
  const securityAuditScore = Math.max(0, 100 - criticalAlerts * 30 - highAlerts * 15);

  const readinessScore = Math.round(
    activeWorkScore * 0.3 + serviceOwnershipScore * 0.25 +
    implicitKnowledgeScore * 0.25 + securityAuditScore * 0.2
  );

  return { readinessScore, readinessBreakdown: { activeWork: activeWorkScore, serviceOwnership: serviceOwnershipScore, implicitKnowledge: implicitKnowledgeScore, securityAudit: securityAuditScore } };
}

export async function synthesizeDossier(req: SynthesizeRequest) {
  const [activeWork, serviceOwnership, implicitKnowledge, secretAudit] = await Promise.all([
    synthesizeActiveWork(req),
    synthesizeServiceOwnership(req),
    synthesizeImplicitKnowledge(req),
    synthesizeSecretAudit(req),
  ]);

  const sections = { activeWork, serviceOwnership, implicitKnowledge, secretAudit };
  const { readinessScore, readinessBreakdown } = calculateReadinessScore(sections);

  return { sections, readinessScore, readinessBreakdown };
}
