import {
  streamText,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
} from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { limitHistory } from "@/lib/chat-history";
import { verifySession } from "@/lib/session";
import { validateMessages } from "@/lib/chat-validation";
import {
  TIMEOUT_MS,
  toErrorMessage,
  abortToTimeoutError,
} from "@/lib/chat-errors";

export async function POST(req: Request) {
  // proxy.tsでも確かめているが、APIの中でももう一度確かめる（二重の守り）
  if (!(await verifySession())) {
    return new Response("ログインが必要です。", { status: 401 });
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return new Response("リクエストの形式が正しくありません。", {
      status: 400,
    });
  }

  const validation = await validateMessages(body);

  if (!validation.ok) {
    return new Response(validation.error, { status: 400 });
  }

  const result = streamText({
    model: anthropic("claude-haiku-5-5"),
    instructions: "あなたは親切で丁寧な汎用アシスタントです。",
    messages: await convertToModelMessages(limitHistory(validation.messages)),
    maxOutputTokens: 1024,
    reasoning: "none",
    timeout: { totalMs: TIMEOUT_MS },
    // ブラウザが通信を切ったら、Claude APIへの処理も止める
    abortSignal: req.signal,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: toErrorMessage,
    }).pipeThrough(abortToTimeoutError()),
  });
}
