import Anthropic from "@anthropic-ai/sdk";
import type { Message } from "@anthropic-ai/sdk/resources/messages";
import { CLARIFY_SYSTEM_PROMPT, GENERATE_SYSTEM_PROMPT } from "./prompts";
import { ClarifyQuestion, Architecture, ProjectSpec } from "./types";

const client = new Anthropic();

function getMessageText(message: Message): string {
  return message.content
    .filter((block): block is Anthropic.Messages.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

/** Handles occasional ```json fences despite system instructions. */
function stripJsonFence(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*\n?/i, "");
    t = t.replace(/\n?```\s*$/i, "");
  }
  return t.trim();
}

function parseArchitectureJson(text: string): Architecture {
  const raw = stripJsonFence(text);
  return JSON.parse(raw) as Architecture;
}

export async function generateClarifyQuestions(
  prompt: string
): Promise<ClarifyQuestion[]> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: CLARIFY_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Here's my project idea:\n\n${prompt}`,
      },
    ],
  });

  const text = getMessageText(message);
  const parsed = JSON.parse(stripJsonFence(text));
  return parsed.questions as ClarifyQuestion[];
}

export async function generateArchitecture(
  spec: ProjectSpec
): Promise<Architecture> {
  const userMessage = `Project description: ${spec.prompt}

User preferences:
${Object.entries(spec.preferences)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join("\n")}

Generate the complete architecture as a JSON object.`;

  const createParams = {
    model: "claude-sonnet-4-6" as const,
    max_tokens: 16384,
    system: GENERATE_SYSTEM_PROMPT,
    messages: [{ role: "user" as const, content: userMessage }],
  };

  let message = await client.messages.create(createParams);
  let text = getMessageText(message);

  let architecture: Architecture;
  try {
    architecture = parseArchitectureJson(text);
  } catch {
    message = await client.messages.create({
      ...createParams,
      messages: [
        ...createParams.messages,
        { role: "assistant" as const, content: text },
        {
          role: "user" as const,
          content:
            "Your previous reply was not valid JSON (truncated or malformed). Reply with ONLY one complete JSON object matching the schema. No markdown. Use shorter descriptions and fewer endpoints per node so the entire object fits.",
        },
      ],
    });
    text = getMessageText(message);
    architecture = parseArchitectureJson(text);
  }

  if (message.stop_reason === "max_tokens") {
    console.warn(
      "Architecture generation hit max_tokens; output may still be incomplete."
    );
  }

  return architecture;
}
