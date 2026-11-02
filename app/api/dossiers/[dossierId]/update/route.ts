import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDossierById, updateDossierSection } from "@/lib/db/store";
import type { UpdateDossierRequest } from "@/types";

type Params = { params: Promise<{ dossierId: string }> };

// PATCH /api/dossiers/[dossierId]/update — user edits to override/annotate the dossier
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { dossierId } = await params;
  const dossier = getDossierById(session.user.id, dossierId);
  if (!dossier) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body: UpdateDossierRequest = await req.json();

  const updated = updateDossierSection(session.user.id, dossierId, {
    userEdits: {
      ...dossier.userEdits,
      ...body,
      editedAt: new Date().toISOString(),
      editedBy: session.user.name ?? session.user.email ?? "Unknown",
    },
    lastUpdated: new Date().toISOString(),
  });

  return NextResponse.json(updated);
}

