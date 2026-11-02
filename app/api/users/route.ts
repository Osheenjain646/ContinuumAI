import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/lib/db/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { name?: unknown; email?: unknown; password?: unknown };
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Request body must be an object" }, { status: 400 });
    }
    const { name, email, password } = body;
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    const user = await createUser(name, email, password);
    return NextResponse.json({ id: user.id, name: user.name, email: user.email }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Registration failed";
    if (message === "Email already registered") {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    if (message.includes("required")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[api/users] registration failed:", err);
    return NextResponse.json({ error: "Registration failed. Check the server database configuration." }, { status: 500 });
  }
}
