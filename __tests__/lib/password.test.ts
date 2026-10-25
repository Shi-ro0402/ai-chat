// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { isCorrectPassword } from "@/lib/password";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isCorrectPassword", () => {
  it("合言葉が一致すれば true", () => {
    vi.stubEnv("APP_PASSWORD", "test-password-123");

    expect(isCorrectPassword("test-password-123")).toBe(true);
  });

  it.each([
    ["違う合言葉", "wrong-password"],
    ["1文字だけ違う", "test-password-124"],
    ["前後に空白がある", " test-password-123 "],
    ["大文字・小文字が違う", "TEST-PASSWORD-123"],
    ["空欄", ""],
  ])("%sなら false", (_, input) => {
    vi.stubEnv("APP_PASSWORD", "test-password-123");

    expect(isCorrectPassword(input)).toBe(false);
  });

  it("APP_PASSWORDが設定されていなければ、どんな入力でも false", () => {
    vi.stubEnv("APP_PASSWORD", "");

    expect(isCorrectPassword("")).toBe(false);
    expect(isCorrectPassword("anything")).toBe(false);
  });
});
