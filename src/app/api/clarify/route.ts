import { NextResponse } from "next/server";
import { generateClarifyQuestions } from "@/lib/claude";
import { requireSessionUser } from "@/lib/require-session";

export async function POST(request: Request) {
  const session = requireSessionUser(request);
  if (session instanceof NextResponse) return session;
  void session;

  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    const questions = await generateClarifyQuestions(prompt);
    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Clarify error:", error);
    return NextResponse.json(
      { error: "Failed to generate questions" },
      { status: 500 }
    );
  }
}
