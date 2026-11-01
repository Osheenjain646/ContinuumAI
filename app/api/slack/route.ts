import { NextRequest, NextResponse } from "next/server";
import { fetchAllSlackActivity } from "@/lib/slack";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, token, daysBack, channels } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "Slack userId is required" },
        { status: 400 }
      );
    }

    const data = await fetchAllSlackActivity({
      userId,
      token: token || process.env.SLACK_BOT_TOKEN,
      daysBack: daysBack ?? 30,
      channels,
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/slack] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch Slack activity" },
      { status: 500 }
    );
  }
}

