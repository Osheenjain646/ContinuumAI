import { NextRequest, NextResponse } from "next/server";
import { fetchAllGitHubActivity } from "@/lib/github";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, token, org, daysBack } = body;

    if (!username) {
      return NextResponse.json(
        { error: "GitHub username is required" },
        { status: 400 }
      );
    }

    const data = await fetchAllGitHubActivity({
      username,
      token: token || process.env.GITHUB_TOKEN,
      org,
      daysBack: daysBack ?? 30,
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/github] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch GitHub activity" },
      { status: 500 }
    );
  }
}

