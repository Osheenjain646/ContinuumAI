import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { chatWithDossier } from "@/lib/chat";
import { getDossierById, getUserDossiers } from "@/lib/db/store";
import { generateMockDossier } from "@/lib/mock-data";
import type { ChatRequest } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const { message, previousInteractionId, dossierId } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY?.trim()) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured. Add it to your .env.local file." },
        { status: 503 }
      );
    }

    // Try to load the real dossier for authenticated users
    let dossier = null;
    const session = await auth();
    if (session?.user?.id) {
      if (dossierId) {
        dossier = await getDossierById(session.user.id, dossierId);
        if (!dossier) {
          return NextResponse.json({ error: "Dossier not found" }, { status: 404 });
        }
      } else {
        const all = await getUserDossiers(session.user.id);
        dossier = all.find((d) => d.status === "complete") ?? all[0] ?? null;
      }
    }

    // Fall back to mock dossier if none found
    if (!dossier) {
      dossier = generateMockDossier();
    }

    let response;
    try {
      response = await chatWithDossier(dossier, message, previousInteractionId);
    } catch (err) {
      console.error("[api/chat] Gemini request failed:", err);
      return NextResponse.json(
        { error: "Unable to reach Gemini. Check the API key and server network connection." },
        { status: 502 }
      );
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error("[api/chat] error:", err);
    return NextResponse.json({ error: "Chat request failed" }, { status: 500 });
  }
}
