import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "session";

// ログイン状態を保つ期間（7日間）
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

// 署名用の秘密の鍵。短い鍵は推測されやすいため、32文字以上を必須にする
function getSecretKey() {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32) {
    return null;
  }

  return new TextEncoder().encode(secret);
}

export function isAuthConfigured() {
  return getSecretKey() !== null && Boolean(process.env.APP_PASSWORD);
}

// 「有効期限までログイン済み」という内容に署名した文字列（トークン）を作る
export async function createSessionToken(expiresAt: Date) {
  const key = getSecretKey();

  if (!key) {
    throw new Error("AUTH_SECRETが設定されていないか、32文字未満です。");
  }

  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(key);
}

// トークンが自分のサーバーで作られたもので、期限内かを確かめる
// 書き換えられていたり、期限切れだったりすれば false
export async function isValidSessionToken(token: string | undefined) {
  const key = getSecretKey();

  if (!token || !key) {
    return false;
  }

  try {
    await jwtVerify(token, key, { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export async function createSession() {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const token = await createSessionToken(expiresAt);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true, // ブラウザのJavaScriptから読めないようにする
    secure: process.env.NODE_ENV === "production", // 公開時はHTTPSでのみ送る
    sameSite: "lax", // 他のサイトからの送信に使われにくくする
    expires: expiresAt,
    path: "/",
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function verifySession() {
  const cookieStore = await cookies();
  return isValidSessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}
