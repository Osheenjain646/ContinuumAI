import { NextRequest, NextResponse } from "next/server";
import { synthesizeDossier } from "@/lib/synthesize";
import type { SynthesizeRequest } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body: SynthesizeRequest = await req.json();

    if (!body.employeeInfo?.name || !body.employeeInfo?.email) {
      return NextResponse.json(
        { error: "employeeInfo with name and email is required" },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const dossier = await synthesizeDossier(body);
    return NextResponse.json(dossier);
  } catch (err) {
    console.error("[api/synthesize] error:", err);
    return NextResponse.json(
      { error: "Failed to synthesize dossier" },
      { status: 500 }
    );
  }
}

