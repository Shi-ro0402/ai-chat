// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSessionToken,
  isAuthConfigured,
  isValidSessionToken,
} from "@/lib/session";

// テスト用の仮の値（本物の.env.localは使わない）
const SECRET = "test-secret-that-is-at-least-32-chars";

function oneHourLater() {
  return new Date(Date.now() + 60 * 60 * 1000);
}

beforeEach(() => {
  vi.stubEnv("AUTH_SECRET", SECRET);
  vi.stubEnv("APP_PASSWORD", "test-password");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isValidSessionToken", () => {
  it("自分のサーバーで作った、期限内のトークンは有効", async () => {
    const token = await createSessionToken(oneHourLater());

    expect(await isValidSessionToken(token)).toBe(true);
  });

  it("トークンがなければ無効", async () => {
    expect(await isValidSessionToken(undefined)).toBe(false);
    expect(await isValidSessionToken("")).toBe(false);
  });

  it("でたらめな文字列は無効", async () => {
    expect(await isValidSessionToken("not-a-token")).toBe(false);
  });

  it("1文字でも書き換えられたトークンは無効", async () => {
    const token = await createSessionToken(oneHourLater());
    const last = token.slice(-1);
    const tampered = token.slice(0, -1) + (last === "A" ? "B" : "A");

    expect(await isValidSessionToken(tampered)).toBe(false);
  });

  it("別の秘密の鍵で作られたトークンは無効（偽造の防止）", async () => {
    vi.stubEnv("AUTH_SECRET", "another-secret-that-is-at-least-32-chars");
    const forged = await createSessionToken(oneHourLater());

    vi.stubEnv("AUTH_SECRET", SECRET);

    expect(await isValidSessionToken(forged)).toBe(false);
  });

  it("有効期限が切れたトークンは無効", async () => {
    const expired = await createSessionToken(new Date(Date.now() - 1000));

    expect(await isValidSessionToken(expired)).toBe(false);
  });

  it("AUTH_SECRETが設定されていなければ、どんなトークンも無効", async () => {
    const token = await createSessionToken(oneHourLater());

    vi.stubEnv("AUTH_SECRET", "");

    expect(await isValidSessionToken(token)).toBe(false);
  });
});

describe("createSessionToken", () => {
  it("AUTH_SECRETが32文字未満なら、トークンを作らない", async () => {
    vi.stubEnv("AUTH_SECRET", "too-short");

    await expect(createSessionToken(oneHourLater())).rejects.toThrow();
  });
});

describe("isAuthConfigured", () => {
  it("APP_PASSWORDとAUTH_SECRET（32文字以上）がそろっていれば true", () => {
    expect(isAuthConfigured()).toBe(true);
  });

  it("APP_PASSWORDがなければ false", () => {
    vi.stubEnv("APP_PASSWORD", "");

    expect(isAuthConfigured()).toBe(false);
  });

  it("AUTH_SECRETが短ければ false", () => {
    vi.stubEnv("AUTH_SECRET", "too-short");

    expect(isAuthConfigured()).toBe(false);
  });
});
