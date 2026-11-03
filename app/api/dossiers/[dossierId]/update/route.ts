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
  const dossier = await getDossierById(session.user.id, dossierId);
  if (!dossier) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: UpdateDossierRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    (body.notes !== undefined && typeof body.notes !== "string") ||
    (body.sectionOverrides !== undefined &&
      (!body.sectionOverrides || typeof body.sectionOverrides !== "object" || Array.isArray(body.sectionOverrides)))
  ) {
    return NextResponse.json({ error: "Invalid dossier update" }, { status: 400 });
  }

  const updated = await updateDossierSection(session.user.id, dossierId, {
    ...(body.sectionOverrides
      ? { sections: { ...dossier.sections, ...body.sectionOverrides } }
      : {}),
    userEdits: {
      ...dossier.userEdits,
      ...body,
      editedAt: new Date().toISOString(),
      editedBy: session.user.name ?? session.user.email ?? "Unknown",
    },
    lastUpdated: new Date().toISOString(),
  });

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}
