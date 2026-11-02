import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDossierById, updateDossierSection, getUserIntegrations } from "@/lib/db/store";
import { fetchAllActivity } from "@/lib/fetch-activity";
import { synthesizeDossier } from "@/lib/synthesize";

type Params = { params: Promise<{ dossierId: string }> };

// POST /api/dossiers/[dossierId]/fetch — trigger background fetch + synthesis
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { dossierId } = await params;
  const dossier = getDossierById(session.user.id, dossierId);
  if (!dossier) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Allow re-fetching — mark as fetching
  updateDossierSection(session.user.id, dossierId, { status: "fetching", progress: 5 });

  // Load user integrations
  const integrations = getUserIntegrations(session.user.id);

  // Run async (don't await — respond immediately, let it run)
  (async () => {
    try {
      // Step 1: Fetch all activity
      updateDossierSection(session.user.id, dossierId, { progress: 20 });
      const activity = await fetchAllActivity(integrations, dossier.departingEmployee);

      updateDossierSection(session.user.id, dossierId, {
        status: "synthesizing",
        progress: 50,
        rawActivity: {
          commits: activity.commits,
          pullRequests: activity.pullRequests,
          slackMessages: activity.slackMessages,
          meetingTranscripts: activity.meetingTranscripts,
          docs: activity.docs,
        },
      });

      // Step 2: AI Synthesis
      const synthesized = await synthesizeDossier({
        githubData: {
          commits: activity.commits,
          pullRequests: activity.pullRequests,
          branches: [],
        },
        slackData: { messages: activity.slackMessages },
        meetingData: { transcripts: activity.meetingTranscripts },
        docsData: { pages: activity.docs },
        employeeInfo: dossier.departingEmployee,
      });

      updateDossierSection(session.user.id, dossierId, {
        status: "complete",
        progress: 100,
        readinessScore: synthesized.readinessScore,
        readinessBreakdown: synthesized.readinessBreakdown,
        sections: synthesized.sections,
        lastUpdated: new Date().toISOString(),
      });
    } catch (err) {
      updateDossierSection(session.user.id, dossierId, {
        status: "error",
        errorMessage: err instanceof Error ? err.message : "Unknown error",
      });
    }
  })();

  return NextResponse.json({ message: "Fetch started", dossierId, status: "fetching" });
}

