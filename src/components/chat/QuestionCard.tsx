"use client";

import { ClarifyQuestion } from "@/lib/types";

interface QuestionCardProps {
  question: ClarifyQuestion;
  answer: string | null;
  onAnswer: (questionId: string, answer: string) => void;
}

export default function QuestionCard({
  question,
  answer,
  onAnswer,
}: QuestionCardProps) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
      <p className="font-medium">{question.question}</p>

      {question.options && question.options.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {question.options.map((option) => (
            <button
              key={option}
              onClick={() => onAnswer(question.id, option)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors cursor-pointer ${
                answer === option
                  ? "bg-accent text-white"
                  : "bg-surface-hover hover:bg-border text-foreground"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      <input
        type="text"
        placeholder="Or type your own answer..."
        value={answer && !question.options?.includes(answer) ? answer : ""}
        onChange={(e) => onAnswer(question.id, e.target.value)}
        className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-accent"
      />
    </div>
  );
}
