/**
 * AI Summarization & Synthesis Engine
 * Uses Gemini API to compile the 4 dossier sections from raw activity
 */

import { GoogleGenAI } from "@google/genai";
import type {
  SynthesizeRequest,
  HandoverDossier,
  ActiveWorkSection,
  ServiceOwnershipSection,
  ImplicitKnowledgeSection,
  SecretAuditSection,
} from "@/types";
import { generateId } from "@/lib/utils";

const client = new GoogleGenAI({});
const MODEL = "gemini-3.8-flash";

// ─── System prompt for noise filtering ───────────────────────────────────────

const NOISE_FILTER_SYSTEM = `You are an expert software engineering analyst specializing in knowledge transfer and offboarding.
Your role is to analyze raw developer activity data and extract only HIGH-SIGNAL information.

FILTER OUT (noise):
- Minor typo fixes, formatting commits, whitespace changes
- "chore:", "style:", "docs: fix typo" commits  
- Casual chat messages ("lol", "👍", "sounds good", "will do")
- Standard meeting pleasantries and scheduling messages
- Auto-generated bot messages

KEEP (signal):
- Architecture decisions, design choices, and their rationale
- Bug fixes with explanations of root causes
- Workarounds, hacks, and TODO/FIXME items with context
- Deployment procedures, runbook steps, and operational knowledge
- Cross-service dependencies and integration points
- Security-related commits, API key references, credential usage
- Handoff mentions, role-specific knowledge, and "you'll need to know" moments
- Unfinished work, open questions, and blockers

Always respond with valid JSON only. No markdown code blocks, no explanation text.`;

// ─── Prompt: Active Work & Blockers ──────────────────────────────────────────

async function synthesizeActiveWork(
  req: SynthesizeRequest
): Promise<ActiveWorkSection> {
  const rawData = {
    commits: req.githubData?.commits?.slice(0, 20) ?? [],
    prs: req.githubData?.pullRequests?.filter((pr) => pr.state === "open") ?? [],
    slackMessages: req.slackData?.messages?.slice(0, 30) ?? [],
    meetingActionItems: req.meetingData?.transcripts?.flatMap(
      (t) => t.actionItems
    ) ?? [],
  };

  const prompt = `${NOISE_FILTER_SYSTEM}

Analyze this developer activity data for ${req.employeeInfo.name} and extract their active work and blockers.

RAW DATA:
${JSON.stringify(rawData, null, 2)}

Return a JSON object matching this TypeScript interface:
{
  inFlightTasks: Array<{
    title: string;
    description: string;
    status: "blocked" | "in-progress" | "needs-review" | "upcoming";
    priority: "urgent" | "high" | "medium" | "low";
    dueDate?: string; // ISO date if determinable
    sourceUrl?: string;
    crossRefs?: Array<{
      slackThreadUrl?: string;
      githubPrUrl?: string;
      meetingDecision?: string;
      docUrl?: string;
      summary: string;
    }>;
  }>;
  pendingPRReviews: Array<{
    id: number;
    number: number;
    title: string;
    state: "open";
    url: string;
    repo: string;
    createdAt: string;
    updatedAt: string;
  }>;
  openBugs: Array<{
    title: string;
    url: string;
    severity: string;
    assignedTo?: string;
  }>;
  upcomingDeadlines: Array<{
    title: string;
    dueDate: string;
    description: string;
  }>;
}

Only return valid JSON, nothing else.`;

  try {
    const interaction = await client.interactions.create({
      model: MODEL,
      input: prompt,
      store: false,
    });

    const text = interaction.output_text ?? "{}";
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned) as ActiveWorkSection;
  } catch (err) {
    console.error("[synthesize] activeWork error:", err);
    return {
      inFlightTasks: [],
      pendingPRReviews: req.githubData?.pullRequests?.filter(pr => pr.state === "open") ?? [],
      openBugs: [],
      upcomingDeadlines: [],
    };
  }
}

// ─── Prompt: Service & System Ownership ──────────────────────────────────────

async function synthesizeServiceOwnership(
  req: SynthesizeRequest
): Promise<ServiceOwnershipSection> {
  const rawData = {
    commits: req.githubData?.commits?.slice(0, 30) ?? [],
    prs: req.githubData?.pullRequests ?? [],
    branches: req.githubData?.branches ?? [],
    slackMessages: req.slackData?.messages?.slice(0, 30) ?? [],
    docs: req.docsData?.pages ?? [],
  };

  const prompt = `${NOISE_FILTER_SYSTEM}

Analyze this developer activity to identify ALL services, repositories, APIs, scripts, and deployment pipelines that ${req.employeeInfo.name} owns or primarily maintains.

RAW DATA:
${JSON.stringify(rawData, null, 2)}

Return a JSON object matching:
{
  ownedServices: Array<{
    name: string;
    type: "microservice" | "repository" | "api" | "script" | "pipeline" | "infra";
    description: string;
    repo?: string;
    deploymentUrl?: string;
    lastDeployed?: string;
    coOwners?: string[];
    tags?: string[];
  }>;
  repositories: Array<{
    name: string;
    url: string;
    primaryLanguage?: string;
    description?: string;
    isPrivate?: boolean;
  }>;
  deploymentPipelines: Array<{
    name: string;
    description: string;
    environment: string;
    lastRun?: string;
    url?: string;
  }>;
}

Only return valid JSON.`;

  try {
    const interaction = await client.interactions.create({
      model: MODEL,
      input: prompt,
      store: false,
    });
    const text = interaction.output_text ?? "{}";
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned) as ServiceOwnershipSection;
  } catch (err) {
    console.error("[synthesize] serviceOwnership error:", err);
    return { ownedServices: [], repositories: [], deploymentPipelines: [] };
  }
}

// ─── Prompt: Implicit Knowledge & Technical Debt ─────────────────────────────

async function synthesizeImplicitKnowledge(
  req: SynthesizeRequest
): Promise<ImplicitKnowledgeSection> {
  const rawData = {
    commits: req.githubData?.commits ?? [],
    slackMessages: req.slackData?.messages ?? [],
    meetingTranscripts: req.meetingData?.transcripts?.map((t) => ({
      title: t.title,
      decisions: t.decisions,
      date: t.date,
    })) ?? [],
    docs: req.docsData?.pages ?? [],
  };

  const prompt = `${NOISE_FILTER_SYSTEM}

Surface ALL implicit knowledge, technical debt, undocumented workarounds, and architectural decisions from ${req.employeeInfo.name}'s activity.

Focus especially on:
1. WORKAROUNDS: Temporary fixes, hacks, "this shouldn't be here" code
2. TECH DEBT: TODO/FIXME items, known fragile systems, manual processes that should be automated
3. ARCHITECTURAL DECISIONS: Why things were built a certain way, rejected alternatives, specific constraints

RAW DATA:
${JSON.stringify(rawData, null, 2)}

Return a JSON object matching:
{
  techDebt: Array<{
    id: string;
    title: string;
    description: string;
    source: "slack" | "github-pr" | "github-commit" | "notion" | "google-docs";
    sourceUrl: string;
    severity: "high" | "medium" | "low";
    category: "workaround" | "unwritten-rule" | "architectural-debt" | "edge-case";
    tags?: string[];
  }>;
  workarounds: Array<{
    title: string;
    description: string;
    affectedSystem: string;
    sourceUrl: string;
    crossRefs?: Array<{
      slackThreadUrl?: string;
      githubPrUrl?: string;
      meetingDecision?: string;
      summary: string;
    }>;
  }>;
  architecturalDecisions: Array<{
    title: string;
    rationale: string;
    alternatives?: string;
    date: string;
    participants?: string[];
    sourceUrl?: string;
  }>;
}

Only return valid JSON.`;

  try {
    const interaction = await client.interactions.create({
      model: MODEL,
      input: prompt,
      store: false,
    });
    const text = interaction.output_text ?? "{}";
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned) as ImplicitKnowledgeSection;
  } catch (err) {
    console.error("[synthesize] implicitKnowledge error:", err);
    return { techDebt: [], workarounds: [], architecturalDecisions: [] };
  }
}

// ─── Prompt: Secret & Access Audit ───────────────────────────────────────────

async function synthesizeSecretAudit(
  req: SynthesizeRequest
): Promise<SecretAuditSection> {
  const rawData = {
    commits: req.githubData?.commits ?? [],
    slackMessages: req.slackData?.messages?.filter((m) =>
      /key|token|secret|password|credential|auth|api[_-]?key|pat|ssh/i.test(
        m.text
      )
    ) ?? [],
    docs: req.docsData?.pages ?? [],
  };

  const prompt = `${NOISE_FILTER_SYSTEM}

SECURITY AUDIT: Identify ALL potential security risks related to ${req.employeeInfo.name}'s departure.

Look for:
1. References to API keys, tokens, PATs, secrets in commits or messages
2. SSH keys or access credentials that may be attributed to this user
3. Cloud resources (AWS, GCP, Azure) linked to the user's personal account
4. Unrotated credentials, hardcoded secrets in commit messages
5. Access that needs to be revoked upon departure

RAW DATA:
${JSON.stringify(rawData, null, 2)}

Return a JSON object matching:
{
  alerts: Array<{
    id: string;
    severity: "critical" | "high" | "medium" | "low";
    type: "hardcoded-pat" | "api-key" | "ssh-key" | "cloud-resource" | "unrotated-secret";
    description: string;
    location: string;
    sourceUrl?: string;
    detected: string; // ISO date
    recommendation: string;
  }>;
  cloudResources: Array<{
    name: string;
    type: string;
    provider: string;
    region?: string;
    linkedToUser: boolean;
    status: "active" | "idle" | "orphaned";
    url?: string;
  }>;
  accessRecommendations: string[];
}

Only return valid JSON.`;

  try {
    const interaction = await client.interactions.create({
      model: MODEL,
      input: prompt,
      store: false,
    });
    const text = interaction.output_text ?? "{}";
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned) as SecretAuditSection;
  } catch (err) {
    console.error("[synthesize] secretAudit error:", err);
    return { alerts: [], cloudResources: [], accessRecommendations: [] };
  }
}

// ─── Readiness Score Calculator ───────────────────────────────────────────────

function calculateReadinessScore(dossier: Omit<HandoverDossier, "id" | "generatedAt" | "lastUpdated" | "readinessScore" | "readinessBreakdown">) {
  const { sections } = dossier;

  // Active work score: lower is better (fewer blockers = more ready)
  const blockedTasks = sections.activeWork.inFlightTasks.filter(
    (t) => t.status === "blocked"
  ).length;
  const pendingPRs = sections.activeWork.pendingPRReviews.length;
  const activeWorkScore = Math.max(
    0,
    100 - blockedTasks * 15 - pendingPRs * 5
  );

  // Service ownership score: having docs and co-owners is better
  const servicesWithCoOwners = sections.serviceOwnership.ownedServices.filter(
    (s) => (s.coOwners?.length ?? 0) > 0
  ).length;
  const totalServices = Math.max(
    sections.serviceOwnership.ownedServices.length,
    1
  );
  const serviceOwnershipScore = Math.round(
    (servicesWithCoOwners / totalServices) * 100
  );

  // Implicit knowledge score: fewer unresolved debt items = better
  const highSeverityDebt = sections.implicitKnowledge.techDebt.filter(
    (d) => d.severity === "high"
  ).length;
  const implicitKnowledgeScore = Math.max(0, 100 - highSeverityDebt * 20);

  // Security score: fewer critical alerts = better
  const criticalAlerts = sections.secretAudit.alerts.filter(
    (a) => a.severity === "critical"
  ).length;
  const highAlerts = sections.secretAudit.alerts.filter(
    (a) => a.severity === "high"
  ).length;
  const securityAuditScore = Math.max(
    0,
    100 - criticalAlerts * 30 - highAlerts * 15
  );

  const readinessScore = Math.round(
    (activeWorkScore * 0.3 +
      serviceOwnershipScore * 0.25 +
      implicitKnowledgeScore * 0.25 +
      securityAuditScore * 0.2)
  );

  return {
    readinessScore,
    readinessBreakdown: {
      activeWork: activeWorkScore,
      serviceOwnership: serviceOwnershipScore,
      implicitKnowledge: implicitKnowledgeScore,
      securityAudit: securityAuditScore,
    },
  };
}

// ─── Main Synthesize Function ─────────────────────────────────────────────────

export async function synthesizeDossier(
  req: SynthesizeRequest
): Promise<HandoverDossier> {
  const [activeWork, serviceOwnership, implicitKnowledge, secretAudit] =
    await Promise.all([
      synthesizeActiveWork(req),
      synthesizeServiceOwnership(req),
      synthesizeImplicitKnowledge(req),
      synthesizeSecretAudit(req),
    ]);

  const now = new Date().toISOString();
  const partial = {
    departingEmployee: req.employeeInfo,
    sections: { activeWork, serviceOwnership, implicitKnowledge, secretAudit },
    rawActivity: {
      commits: req.githubData?.commits ?? [],
      pullRequests: req.githubData?.pullRequests ?? [],
      slackMessages: req.slackData?.messages ?? [],
      meetingTranscripts: req.meetingData?.transcripts ?? [],
      docs: req.docsData?.pages ?? [],
    },
  };

  const { readinessScore, readinessBreakdown } =
    calculateReadinessScore(partial);

  return {
    id: generateId(),
    ...partial,
    generatedAt: now,
    lastUpdated: now,
    readinessScore,
    readinessBreakdown,
  };
}

