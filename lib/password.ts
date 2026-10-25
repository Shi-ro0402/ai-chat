import { createHash, timingSafeEqual } from "node:crypto";

// 入力された合言葉が、.env.localのAPP_PASSWORDと一致するかを確かめる
export function isCorrectPassword(input: string) {
  const expected = process.env.APP_PASSWORD;

  if (!expected) {
    return false;
  }

  // 同じ長さのハッシュ値にしてから、比較にかかる時間が一定の方法で比べる
  // （比較時間の差から、合言葉を1文字ずつ推測されるのを防ぐ）
  const inputHash = createHash("sha256").update(input).digest();
  const expectedHash = createHash("sha256").update(expected).digest();

  return timingSafeEqual(inputHash, expectedHash);
}
