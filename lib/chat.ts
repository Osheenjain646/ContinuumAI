/**
 * RAG Chat Engine — "Ask-The-Departure Bot"
 * Answers successor questions using Gemini with dossier context
 */

import { GoogleGenAI } from "@google/genai";
import type { HandoverDossier, ChatMessage } from "@/types";
import { generateId } from "@/lib/utils";

const client = new GoogleGenAI({});
const MODEL = "gemini-3.8-flash";

// Build a rich context document from the dossier
function buildDossierContext(dossier: HandoverDossier): string {
  const { departingEmployee: emp, sections, rawActivity } = dossier;

  return `
# Knowledge Base for ${emp.name} (${emp.role ?? "Engineer"}) — Handover Dossier

## Employee Info
- Name: ${emp.name}
- Email: ${emp.email}
- GitHub: ${emp.githubUsername ?? "unknown"}
- Team: ${emp.team ?? "unknown"}
- Role: ${emp.role ?? "unknown"}

## Active Work & Blockers
${sections.activeWork.inFlightTasks
  .map(
    (t) =>
      `- [${t.status.toUpperCase()}] ${t.title}: ${t.description}${t.sourceUrl ? ` (${t.sourceUrl})` : ""}`
  )
  .join("\n")}

Pending PR Reviews:
${sections.activeWork.pendingPRReviews.map((pr) => `- PR #${pr.number} "${pr.title}" in ${pr.repo} (${pr.url})`).join("\n")}

## Service Ownership
${sections.serviceOwnership.ownedServices
  .map(
    (s) =>
      `- ${s.name} [${s.type}]: ${s.description}${s.coOwners?.length ? ` | Co-owners: ${s.coOwners.join(", ")}` : ""}`
  )
  .join("\n")}

Repositories:
${sections.serviceOwnership.repositories.map((r) => `- ${r.name}: ${r.description ?? ""} (${r.url})`).join("\n")}

Deployment Pipelines:
${sections.serviceOwnership.deploymentPipelines.map((p) => `- ${p.name} [${p.environment}]: ${p.description}${p.url ? ` (${p.url})` : ""}`).join("\n")}

## Technical Debt & Workarounds
${sections.implicitKnowledge.techDebt
  .map((d) => `- [${d.severity.toUpperCase()}] ${d.title}: ${d.description} (${d.sourceUrl})`)
  .join("\n")}

Known Workarounds:
${sections.implicitKnowledge.workarounds
  .map((w) => `- ${w.title} in ${w.affectedSystem}: ${w.description} (${w.sourceUrl})`)
  .join("\n")}

Architectural Decisions:
${sections.implicitKnowledge.architecturalDecisions
  .map((d) => `- ${d.title} (${d.date}): ${d.rationale}${d.alternatives ? ` | Alternatives considered: ${d.alternatives}` : ""}`)
  .join("\n")}

## Security & Access Alerts
${sections.secretAudit.alerts
  .map((a) => `- [${a.severity.toUpperCase()}] ${a.type}: ${a.description} | Location: ${a.location} | Recommendation: ${a.recommendation}`)
  .join("\n")}

## Recent Commits (last 20)
${rawActivity.commits
  .slice(0, 20)
  .map((c) => `- [${c.sha}] ${c.message} in ${c.repo} on ${c.date} (${c.url})`)
  .join("\n")}

## Slack Activity (key messages)
${rawActivity.slackMessages
  .slice(0, 20)
  .map((m) => `- [#${m.channel}] ${m.text.slice(0, 200)} (${m.url})`)
  .join("\n")}

## Meeting Decisions
${rawActivity.meetingTranscripts
  .flatMap((t) =>
    t.decisions.map((d) => `- [${t.title} on ${t.date}] ${d}${t.sourceUrl ? ` (${t.sourceUrl})` : ""}`)
  )
  .join("\n")}

## Documentation
${rawActivity.docs.map((d) => `- [${d.source}] ${d.title}: ${d.snippet} (${d.url})`).join("\n")}
`.trim();
}

// ─── Main chat function ───────────────────────────────────────────────────────

export async function chatWithDossier(
  dossier: HandoverDossier,
  userMessage: string,
  previousInteractionId?: string
): Promise<ChatMessage> {
  const context = buildDossierContext(dossier);

  const systemInstruction = `You are "Continuum", an AI assistant that helps team members understand the work and context left behind by ${dossier.departingEmployee.name}, who has left or is transitioning out of the team.

You have access to a comprehensive knowledge base of their activity including:
- GitHub commits, pull requests, and code review discussions
- Slack messages and technical discussions  
- Meeting transcripts with decisions and action items
- Project documentation

KNOWLEDGE BASE:
${context}

GUIDELINES:
1. Always cite specific sources when answering (commit hashes, Slack message links, PR URLs, doc links)
2. If you don't know something, say so clearly — don't fabricate
3. Highlight any critical security or access issues when relevant
4. Format responses clearly with bullet points and headers where appropriate
5. When multiple sources support an answer, link all of them
6. Flag any workarounds or edge cases the successor should be aware of`;

  const interactionParams: Parameters<typeof client.interactions.create>[0] = {
    model: MODEL,
    input: userMessage,
    system_instruction: systemInstruction,
    store: true,
  };

  if (previousInteractionId) {
    interactionParams.previous_interaction_id = previousInteractionId;
  }

  try {
    const interactionResult = await client.interactions.create(interactionParams);
    // interactions.create with stream:false returns GoogleGenAIInteraction
    const interaction = interactionResult as import("@google/genai").GoogleGenAIInteraction;
    const responseText = interaction.output_text ?? "I couldn't generate a response. Please try again.";

    // Extract source citations from the response (simple heuristic)
    const urlRegex = /https?:\/\/[^\s)]+/g;
    const foundUrls = responseText.match(urlRegex) ?? [];

    const sources: NonNullable<ChatMessage["sources"]> = foundUrls
      .slice(0, 5)
      .map((url: string) => {
        let type: NonNullable<ChatMessage["sources"]>[0]["type"] = "doc";
        if (url.includes("github.com")) type = "github";
        else if (url.includes("slack.com")) type = "slack";
        else if (url.includes("meet.google.com") || url.includes("zoom.us"))
          type = "meeting";

        return {
          type,
          title: url.split("/").slice(-2).join("/"),
          url,
        };
      });

    return {
      id: generateId(),
      role: "assistant",
      content: responseText,
      timestamp: new Date().toISOString(),
      sources: sources.length > 0 ? sources : undefined,
      // Store the interaction ID so the next message can continue the thread
      ...(interaction.id ? { interactionId: interaction.id } : {}),
    } as ChatMessage & { interactionId?: string };
  } catch (err) {
    console.error("[chat] chatWithDossier error:", err);
    return {
      id: generateId(),
      role: "assistant",
      content:
        "I encountered an error processing your question. Please check that your Gemini API key is configured and try again.",
      timestamp: new Date().toISOString(),
    };
  }
}
