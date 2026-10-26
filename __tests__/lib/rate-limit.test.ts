// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Upstash Redisには接続せず、回数の判定結果を差し替える
const limit = vi.fn();

vi.mock("@upstash/redis", () => ({
  Redis: { fromEnv: () => ({}) },
}));

vi.mock("@upstash/ratelimit", () => {
  class Ratelimit {
    static slidingWindow() {
      return {};
    }
    limit = limit;
  }
  return { Ratelimit };
});

const { checkRateLimit, getClientIp, toRetryMessage } = await import(
  "@/lib/rate-limit"
);

function request(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/chat", { method: "POST", headers });
}

beforeEach(() => {
  limit.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("getClientIp", () => {
  it("x-forwarded-forの先頭を使う", () => {
    expect(
      getClientIp(request({ "x-forwarded-for": "203.0.113.1, 10.0.0.1" })),
    ).toBe("203.0.113.1");
  });

  it("x-forwarded-forがなければx-real-ipを使う", () => {
    expect(getClientIp(request({ "x-real-ip": "203.0.113.2" }))).toBe(
      "203.0.113.2",
    );
  });

  it("どちらもなければunknown", () => {
    expect(getClientIp(request())).toBe("unknown");
  });
});

describe("toRetryMessage", () => {
  it("残り時間を分に切り上げて伝える", () => {
    expect(toRetryMessage(2.5 * 60_000, 0)).toContain("約3分後");
  });

  it("1分未満でも「約1分後」と伝える", () => {
    expect(toRetryMessage(10_000, 0)).toContain("約1分後");
  });
});

describe("checkRateLimit（Upstashの設定なし）", () => {
  beforeEach(() => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("KV_REST_API_URL", "");
    vi.stubEnv("KV_REST_API_TOKEN", "");
  });

  it("ローカルの開発では制限しない", async () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(await checkRateLimit(request())).toEqual({ ok: true });
    expect(limit).not.toHaveBeenCalled();
  });

  it("本番では、制限なしで公開されないよう503で止める", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const result = await checkRateLimit(request());

    expect(result).toMatchObject({ ok: false, status: 503 });
  });
});

describe("checkRateLimit（Upstashの設定あり）", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
  });

  it("回数内なら通し、IPアドレスごとに数える", async () => {
    limit.mockResolvedValue({ success: true, reset: Date.now() });

    const result = await checkRateLimit(
      request({ "x-forwarded-for": "203.0.113.1" }),
    );

    expect(result).toEqual({ ok: true });
    expect(limit).toHaveBeenCalledWith("203.0.113.1");
  });

  it("回数を超えたら429と待ち時間を返す", async () => {
    limit.mockResolvedValue({ success: false, reset: Date.now() + 4 * 60_000 });

    const result = await checkRateLimit(request());

    expect(result).toMatchObject({ ok: false, status: 429 });
    expect(result.ok === false && result.message).toContain("10分間に5回");
  });

  it("Redisにつながらないときは、通さずに503を返す", async () => {
    limit.mockRejectedValue(new Error("connection refused"));

    const result = await checkRateLimit(request());

    expect(result).toMatchObject({ ok: false, status: 503 });
    expect(result.ok === false && result.message).not.toContain(
      "connection refused",
    );
  });

  it("KV_REST_API_URL・KV_REST_API_TOKENの名前でも動く", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("KV_REST_API_URL", "https://example.upstash.io");
    vi.stubEnv("KV_REST_API_TOKEN", "test-token");
    limit.mockResolvedValue({ success: true, reset: Date.now() });

    expect(await checkRateLimit(request())).toEqual({ ok: true });
  });
});
