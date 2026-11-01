import { NextRequest, NextResponse } from "next/server";
import { chatWithDossier } from "@/lib/chat";
import { generateMockDossier } from "@/lib/mock-data";
import type { ChatRequest } from "@/types";

// In production, you would fetch the dossier from a database
// For now we use the mock dossier as the knowledge base
export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const { message, previousInteractionId } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          content:
            "⚠️ GEMINI_API_KEY is not configured. Please add it to your .env.local file to enable the AI chat feature.",
          sources: [],
        },
        { status: 200 }
      );
    }

    // In production: fetch dossier from DB by dossierId
    const dossier = generateMockDossier();

    const response = await chatWithDossier(
      dossier,
      message,
      previousInteractionId
    );

    return NextResponse.json(response);
  } catch (err) {
    console.error("[api/chat] error:", err);
    return NextResponse.json(
      { error: "Chat request failed" },
      { status: 500 }
    );
  }
}

