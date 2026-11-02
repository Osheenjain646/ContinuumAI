import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserIntegrations, saveUserIntegrations } from "@/lib/db/store";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const integrations = getUserIntegrations(session.user.id);
  // Mask tokens before returning
  const masked = maskTokens(integrations);
  return NextResponse.json(masked);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const updated = saveUserIntegrations(session.user.id, body);
  return NextResponse.json(maskTokens(updated));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function maskTokens(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  const masked = { ...obj };
  const sensitiveKeys = ["token", "apiToken", "appPassword", "botToken", "userToken", "accessToken", "apiKey", "zoomApiKey", "zoomApiSecret", "googleDocsToken", "passwordHash"];
  for (const key of Object.keys(masked)) {
    if (sensitiveKeys.includes(key) && masked[key]) {
      masked[key] = "••••••••";
    } else if (typeof masked[key] === "object" && masked[key] !== null) {
      masked[key] = maskTokens(masked[key]);
    }
  }
  return masked;
}

