import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// 1人（IPアドレス）あたり、10分間に送れる質問の数
export const RATE_LIMIT_COUNT = 5;
export const RATE_LIMIT_MINUTES = 10;

export type RateLimitResult =
  | { ok: true }
  | { ok: false; status: 429 | 503; message: string };

// Vercelのサーバーは複数台・使い捨てのため、回数はUpstash Redisに記録する
// 接続先はVercelのMarketplaceで連携すると自動で登録される環境変数から読む
function isRedisConfigured() {
  return Boolean(
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
      (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
  );
}

let ratelimit: Ratelimit | null = null;

function getRatelimit() {
  ratelimit ??= new Ratelimit({
    redis: Redis.fromEnv(),
    // 直近10分間の回数で数える（区切りの時刻をまたいでまとめて送られるのを防ぐ）
    limiter: Ratelimit.slidingWindow(
      RATE_LIMIT_COUNT,
      `${RATE_LIMIT_MINUTES} m`,
    ),
    prefix: "ai-chat:ratelimit",
  });

  return ratelimit;
}

// 送信元のIPアドレス。Vercelではx-forwarded-forの先頭が利用者のIPアドレスになる
export function getClientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || req.headers.get("x-real-ip");

  return ip || "unknown";
}

export function toRetryMessage(resetAt: number, now = Date.now()) {
  const minutes = Math.max(1, Math.ceil((resetAt - now) / 60_000));
  return `短時間に送信できる回数（${RATE_LIMIT_MINUTES}分間に${RATE_LIMIT_COUNT}回）を超えました。約${minutes}分後に再試行してください。`;
}

export async function checkRateLimit(req: Request): Promise<RateLimitResult> {
  if (!isRedisConfigured()) {
    // ローカルの開発では、Upstashがなくても動かせるように制限をかけない
    if (process.env.NODE_ENV !== "production") {
      return { ok: true };
    }

    // 本番で設定を忘れると、回数制限なしで公開されてしまうため、送信を止める（安全な側に倒す）
    console.error(
      "回数制限の設定がありません。VercelでUpstash Redisを連携し、再デプロイしてください。",
    );
    return {
      ok: false,
      status: 503,
      message: "回数制限の設定が完了していないため、現在利用できません。",
    };
  }

  try {
    const { success, reset } = await getRatelimit().limit(getClientIp(req));

    if (!success) {
      return { ok: false, status: 429, message: toRetryMessage(reset) };
    }

    return { ok: true };
  } catch (error) {
    console.error("回数制限の確認に失敗しました。", error);
    return {
      ok: false,
      status: 503,
      message: "一時的に利用できません。しばらく待ってから再試行してください。",
    };
  }
}
