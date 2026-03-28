"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { PROJECTS_CHANGED_EVENT } from "@/lib/sidebar-events";
import { ClarifyQuestion } from "@/lib/types";
import QuestionCard from "./QuestionCard";

const PROMPT_IDEAS = [
  "I want to build a SaaS invoicing platform with Stripe payments, PDF generation, and email notifications.",
  "A real-time collaborative whiteboard: WebSockets, shared cursors, and export to PNG or PDF.",
  "An e-commerce marketplace with seller dashboards, inventory, search, and a recommendation feed.",
  "A habit-tracking PWA with streaks, reminders, and simple weekly analytics.",
  "An internal API gateway with OAuth, rate limits, request logging, and service routing.",
  "A multi-tenant blog: markdown editor, comments, tags, and per-organization themes.",
  "A fitness app with workout plans, progress charts, and optional coach messaging.",
  "A small social audio app: rooms, mute states, and a minimal listener presence UI.",
];

export default function ChatInterface() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [textareaFocused, setTextareaFocused] = useState(false);
  const [typedSample, setTypedSample] = useState("");
  const [questions, setQuestions] = useState<ClarifyQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"input" | "clarify" | "generating">(
    "input"
  );

  const showTypingDemo =
    step === "input" && prompt === "" && !textareaFocused;

  const showTypingOverlay = hydrated && showTypingDemo;

  useEffect(() => {
    setHydrated(true);
  }, []);

  const animRef = useRef({
    sample: 0,
    char: 0,
    deleting: false,
  });

  useEffect(() => {
    if (!showTypingOverlay) {
      setTypedSample("");
      animRef.current = { sample: 0, char: 0, deleting: false };
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const schedule = (fn: () => void, ms: number) => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
    };

    const typeMs = 36;
    const deleteMs = 20;
    const pauseTypedMs = 2400;
    const pauseBetweenMs = 550;

    const run = () => {
      if (cancelled) return;
      const { sample, char, deleting } = animRef.current;
      const text = PROMPT_IDEAS[sample % PROMPT_IDEAS.length]!;

      if (!deleting) {
        if (char < text.length) {
          const next = char + 1;
          animRef.current = { ...animRef.current, char: next };
          setTypedSample(text.slice(0, next));
          schedule(run, typeMs);
        } else {
          schedule(() => {
            if (cancelled) return;
            animRef.current = { ...animRef.current, deleting: true };
            run();
          }, pauseTypedMs);
        }
      } else if (char > 0) {
        const next = char - 1;
        animRef.current = { ...animRef.current, char: next };
        setTypedSample(text.slice(0, next));
        schedule(run, deleteMs);
      } else {
        animRef.current = {
          sample: (sample + 1) % PROMPT_IDEAS.length,
          char: 0,
          deleting: false,
        };
        schedule(run, pauseBetweenMs);
      }
    };

    schedule(run, 280);
    return () => {
      cancelled = true;
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [showTypingOverlay]);

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

      window.dispatchEvent(new Event(PROJECTS_CHANGED_EVENT));
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
        <div
          className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 pt-1 text-sm text-muted"
          aria-label="Describe it, diagram it, build it"
        >
          <span className="inline-flex items-center gap-1.5">
            <svg
              className="h-4 w-4 shrink-0 text-accent opacity-90"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Describe it.
          </span>
          <span className="select-none text-border/70" aria-hidden>
            ·
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg
              className="h-4 w-4 shrink-0 text-accent opacity-90"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="5" cy="6" r="2.25" />
              <circle cx="19" cy="6" r="2.25" />
              <circle cx="12" cy="18" r="2.25" />
              <path d="m7 7.5 4.5 8M17 7.5l-4.5 8" />
            </svg>
            Diagram it.
          </span>
          <span className="select-none text-border/70" aria-hidden>
            ·
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg
              className="h-4 w-4 shrink-0 text-accent opacity-90"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
            Build it.
          </span>
        </div>
      </div>

      {/* Prompt input */}
      <div className="space-y-3">
        <div
          className={`relative rounded-lg border-2 border-border bg-surface shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-[border-color,box-shadow] focus-within:border-accent focus-within:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(99,102,241,0.25)] ${
            step !== "input" ? "opacity-60" : ""
          }`}
        >
          {/* Background + border live on wrapper so textarea can stay transparent and show the layer below */}
          {showTypingOverlay && (
            <div
              className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit] px-4 py-3 text-left text-sm leading-relaxed text-muted"
              aria-hidden
            >
              <span className="whitespace-pre-wrap break-words">{typedSample}</span>
              <span className="ml-px inline-block h-[1.15em] w-px translate-y-[0.12em] bg-muted/70 animate-pulse" />
            </div>
          )}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onFocus={() => setTextareaFocused(true)}
            onBlur={() => setTextareaFocused(false)}
            aria-label="Project description"
            placeholder={
              !prompt &&
              (textareaFocused || !hydrated)
                ? "Describe your project idea…"
                : ""
            }
            className={`relative z-[1] h-32 w-full resize-none border-0 bg-transparent px-4 py-3 text-sm leading-relaxed outline-none ring-0 placeholder:text-muted focus:ring-0 focus-visible:ring-0 disabled:cursor-not-allowed ${
              showTypingOverlay
                ? "text-transparent caret-transparent"
                : "text-foreground"
            }`}
            disabled={step !== "input"}
          />
        </div>

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
