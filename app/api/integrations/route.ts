import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getUserIntegrations,
  maskIntegrationSecrets,
  saveUserIntegrations,
} from "@/lib/db/store";
import type { UserIntegrations } from "@/types";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const integrations = await getUserIntegrations(session.user.id);
  return NextResponse.json(maskIntegrationSecrets(integrations));
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Integration settings must be an object" }, { status: 400 });
  }

  const updated = await saveUserIntegrations(
    session.user.id,
    body as Partial<UserIntegrations>
  );
  return NextResponse.json(maskIntegrationSecrets(updated));
}
