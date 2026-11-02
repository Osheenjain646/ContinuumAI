import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserDossiers, saveDossier, getDossierById } from "@/lib/db/store";
import { v4 as uuidv4 } from "uuid";
import type { StoredDossier, EmployeeInfo } from "@/types";

// GET /api/dossiers — list all dossiers for the logged-in user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dossiers = getUserDossiers(session.user.id);
  // Return summary list (without full rawActivity to keep response small)
  const summaries = dossiers.map(({ rawActivity, sections, ...rest }) => ({
    ...rest,
    commitCount: rawActivity?.commits?.length ?? 0,
    slackCount: rawActivity?.slackMessages?.length ?? 0,
    docsCount: rawActivity?.docs?.length ?? 0,
    alertCount: sections?.secretAudit?.alerts?.length ?? 0,
  }));
  return NextResponse.json(summaries);
}

// POST /api/dossiers — create a new dossier (just the shell, fetch happens separately)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { departingEmployee }: { departingEmployee: EmployeeInfo } = await req.json();
  if (!departingEmployee?.name || !departingEmployee?.email) {
    return NextResponse.json({ error: "Employee name and email are required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const dossier: StoredDossier = {
    id: uuidv4(),
    ownerId: session.user.id,
    departingEmployee,
    generatedAt: now,
    lastUpdated: now,
    status: "pending",
    progress: 0,
    readinessScore: 0,
    readinessBreakdown: { activeWork: 0, serviceOwnership: 0, implicitKnowledge: 0, securityAudit: 0 },
    sections: {
      activeWork: { inFlightTasks: [], pendingPRReviews: [], openBugs: [], upcomingDeadlines: [] },
      serviceOwnership: { ownedServices: [], repositories: [], deploymentPipelines: [] },
      implicitKnowledge: { techDebt: [], workarounds: [], architecturalDecisions: [] },
      secretAudit: { alerts: [], cloudResources: [], accessRecommendations: [] },
    },
    rawActivity: { commits: [], pullRequests: [], slackMessages: [], meetingTranscripts: [], docs: [] },
  };

  saveDossier(session.user.id, dossier);
  return NextResponse.json(dossier, { status: 201 });
}

