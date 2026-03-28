import { NextResponse } from "next/server";
import { generateClarifyQuestions } from "@/lib/claude";

export async function POST(request: Request) {
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
