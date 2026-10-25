// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  APICallError,
  LoadAPIKeyError,
  RetryError,
  simulateReadableStream,
  streamText,
  toUIMessageStream,
} from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { abortToTimeoutError, toErrorMessage } from "@/lib/chat-errors";

function apiError(statusCode: number) {
  return new APICallError({
    message: "internal detail",
    url: "https://example.com",
    requestBodyValues: {},
    statusCode,
  });
}

const BUSY =
  "AIサービスが混み合っているか、一時的に利用できません。しばらく待ってから再試行してください。";
const UNKNOWN = "回答の生成中にエラーが発生しました。再試行してください。";

describe("toErrorMessage", () => {
  it("APIキーが設定されていない", () => {
    expect(toErrorMessage(new LoadAPIKeyError({ message: "missing" }))).toBe(
      "APIキーが設定されていません。",
    );
  });

  it.each([401, 403])("APIキーが正しくない（%i）", (status) => {
    expect(toErrorMessage(apiError(status))).toBe(
      "APIキーが正しくないか、利用する権限がありません。",
    );
  });

  it("リクエスト過多（429）", () => {
    expect(toErrorMessage(apiError(429))).toBe(
      "リクエストが集中しています。しばらく待ってから再試行してください。",
    );
  });

  it("Claude側の障害・混雑（529）", () => {
    expect(toErrorMessage(apiError(529))).toBe(BUSY);
  });

  it("自動リトライ後の失敗は、最後のエラーで判断する", () => {
    const error = new RetryError({
      message: "failed after 3 attempts",
      reason: "maxRetriesExceeded",
      errors: [apiError(529), apiError(529), apiError(529)],
    });

    expect(toErrorMessage(error)).toBe(BUSY);
  });

  it("不明なエラーは、内部の情報を出さない", () => {
    const message = toErrorMessage(new Error("secret internal"));

    expect(message).toBe(UNKNOWN);
    expect(message).not.toContain("secret");
  });

  it("その他のAPIエラー（400）", () => {
    expect(toErrorMessage(apiError(400))).toBe(UNKNOWN);
  });
});

// AI SDKのテスト用モデル（Claudeと通信しない偽物のAI）を使う
function slowModel(chunkDelayInMs: number) {
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        initialDelayInMs: 5,
        chunkDelayInMs,
        chunks: [
          { type: "stream-start", warnings: [] },
          { type: "text-start", id: "1" },
          { type: "text-delta", id: "1", delta: "途中" },
          { type: "text-delta", id: "1", delta: "まで" },
          { type: "text-end", id: "1" },
          {
            type: "finish",
            finishReason: { unified: "stop", raw: "stop" },
            usage: {
              inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
              outputTokens: { total: 1, text: 1, reasoning: 0 },
            },
          },
        ],
      }),
    }),
  });
}

// ブラウザへ送られるデータの種類を順番に集める
async function collectChunkTypes(chunkDelayInMs: number, totalMs: number) {
  const result = streamText({
    model: slowModel(chunkDelayInMs),
    prompt: "hi",
    maxRetries: 0,
    timeout: { totalMs },
  });

  const types: string[] = [];
  const reader = toUIMessageStream({
    stream: result.stream,
    onError: toErrorMessage,
  })
    .pipeThrough(abortToTimeoutError())
    .getReader();

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      return types;
    }

    types.push(value.type === "error" ? `error:${value.errorText}` : value.type);
  }
}

describe("abortToTimeoutError", () => {
  it("タイムアウト（中断）をエラーに置き換える", async () => {
    const types = await collectChunkTypes(100, 250);

    expect(types).toContain(
      "error:60秒以内に回答が完了しませんでした。再試行してください。",
    );
    expect(types).not.toContain("abort");
  });

  it("正常な回答はそのまま流す", async () => {
    const types = await collectChunkTypes(5, 5000);

    expect(types).toContain("finish");
    expect(types.some((type) => type.startsWith("error"))).toBe(false);
  });
});
