import { NextResponse } from "next/server";
import { chatRequestSchema, type ChatMessage } from "@onlinesadar/shared";
import { buildChatSystemPrompt } from "@/lib/chat/prompt";
import { fallbackChatReply } from "@/lib/chat/fallback";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

function getApiKey(): string | undefined {
  return process.env.OPENAI_API_KEY?.trim() || process.env.CHAT_API_KEY?.trim();
}

function getModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

function lastUserMessage(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return "";
}

async function callOpenAI(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("CHAT_NOT_CONFIGURED");
  }

  const baseUrl = process.env.OPENAI_API_BASE?.trim()?.replace(/\/$/, "") || OPENAI_URL.replace("/chat/completions", "");

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getModel(),
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 600,
      temperature: 0.6,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("Chat API error:", res.status, errText.slice(0, 300));
    throw new Error("CHAT_UPSTREAM_ERROR");
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("CHAT_EMPTY_RESPONSE");
  return content;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = chatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { messages, page } = parsed.data;
    const recent = messages.slice(-10);
    const userText = lastUserMessage(recent);

    let reply: string;

    if (getApiKey()) {
      const systemPrompt = buildChatSystemPrompt(page);
      reply = await callOpenAI(systemPrompt, recent);
    } else {
      reply = fallbackChatReply(userText);
    }

    return NextResponse.json({ message: reply });
  } catch (err) {
    const code = err instanceof Error ? err.message : "UNKNOWN";

    if (code === "CHAT_NOT_CONFIGURED") {
      return NextResponse.json({ message: fallbackChatReply(lastUserMessage([])) });
    }

    return NextResponse.json(
      { error: "Sorry, I couldn't respond right now. Please try again or contact us on WhatsApp." },
      { status: 502 }
    );
  }
}

export const runtime = "nodejs";
