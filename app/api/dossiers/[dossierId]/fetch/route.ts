import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getDossierById,
  getUserIntegrations,
  updateDossierSection,
} from "@/lib/db/store";
import { fetchAllActivity } from "@/lib/fetch-activity";
import { synthesizeDossier } from "@/lib/synthesize";

type Params = { params: Promise<{ dossierId: string }> };

// POST /api/dossiers/[dossierId]/fetch — fetch selected sources and synthesize the dossier
export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { dossierId } = await params;
  const dossier = await getDossierById(userId, dossierId);
  if (!dossier) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Allow re-fetching — mark as fetching
  await updateDossierSection(userId, dossierId, {
    status: "fetching",
    progress: 5,
    fetchWarnings: [],
  });
  const integrations = await getUserIntegrations(userId);

  try {
    await updateDossierSection(userId, dossierId, { progress: 20 });
    const activity = await fetchAllActivity(integrations, dossier.departingEmployee);

    await updateDossierSection(userId, dossierId, {
      status: "synthesizing",
      progress: 50,
      rawActivity: {
        commits: activity.commits,
        pullRequests: activity.pullRequests,
        slackMessages: activity.slackMessages,
        meetingTranscripts: activity.meetingTranscripts,
        docs: activity.docs,
      },
      fetchWarnings: activity.warnings,
    });

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

    const latestDossier = await getDossierById(userId, dossierId);
    if (!latestDossier) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const completed = await updateDossierSection(userId, dossierId, {
      status: "complete",
      progress: 100,
      readinessScore: synthesized.readinessScore,
      readinessBreakdown: synthesized.readinessBreakdown,
      sections: {
        ...synthesized.sections,
        ...latestDossier.userEdits?.sectionOverrides,
      },
      lastUpdated: new Date().toISOString(),
    });
    if (!completed) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(completed);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unable to fetch and synthesize this dossier.";
    await updateDossierSection(userId, dossierId, {
      status: "error",
      errorMessage,
    });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
