import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDossierById, updateDossierSection, deleteDossier } from "@/lib/db/store";

type Params = { params: Promise<{ dossierId: string }> };

// GET /api/dossiers/[dossierId]
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { dossierId } = await params;
  const dossier = getDossierById(session.user.id, dossierId);
  if (!dossier) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(dossier);
}

// DELETE /api/dossiers/[dossierId]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { dossierId } = await params;
  const ok = deleteDossier(session.user.id, dossierId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

