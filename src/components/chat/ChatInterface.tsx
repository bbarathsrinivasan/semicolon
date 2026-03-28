"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClarifyQuestion } from "@/lib/types";
import QuestionCard from "./QuestionCard";

export default function ChatInterface() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [questions, setQuestions] = useState<ClarifyQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"input" | "clarify" | "generating">(
    "input"
  );

  const handleSubmitPrompt = async () => {
    if (!prompt.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      setQuestions(data.questions);
      setStep("clarify");
    } catch (err) {
      console.error("Failed to get questions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const allAnswered = questions.every((q) => answers[q.id]?.trim());

  const handleGenerate = async () => {
    setStep("generating");
    setLoading(true);

    try {
      // Create project
      const spec = {
        prompt,
        preferences: answers,
      };

      const projectRes = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: prompt.slice(0, 50),
          spec,
        }),
      });
      const { project } = await projectRes.json();

      // Generate architecture
      await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, spec }),
      });

      router.push(`/project/${project.id}`);
    } catch (err) {
      console.error("Failed to generate:", err);
      setStep("clarify");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl w-full mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">
          Semicolon<span className="text-accent">;</span>
        </h1>
        <p className="text-muted">Describe the project you want to build</p>
      </div>

      {/* Prompt input */}
      <div className="space-y-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="I want to build a SaaS invoicing platform with Stripe payments, PDF generation, and email notifications..."
          className="w-full h-32 px-4 py-3 bg-surface border border-border rounded-lg resize-none focus:outline-none focus:border-accent text-foreground placeholder:text-muted"
          disabled={step !== "input"}
        />

        {step === "input" && (
          <button
            onClick={handleSubmitPrompt}
            disabled={!prompt.trim() || loading}
            className="w-full py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Thinking...
              </span>
            ) : (
              "Describe my project"
            )}
          </button>
        )}
      </div>

      {/* Clarification questions */}
      {step !== "input" && questions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            A few questions before we architect:
          </h2>

          {questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              answer={answers[q.id] || null}
              onAnswer={handleAnswer}
            />
          ))}

          {step === "clarify" && (
            <button
              onClick={handleGenerate}
              disabled={!allAnswered || loading}
              className="w-full py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors cursor-pointer"
            >
              Generate Architecture
            </button>
          )}

          {step === "generating" && (
            <div className="flex items-center justify-center gap-2 py-3 text-muted">
              <span className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              Generating your architecture...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
