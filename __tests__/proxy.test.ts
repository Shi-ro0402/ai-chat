// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { SESSION_COOKIE, createSessionToken } from "@/lib/session";

beforeEach(() => {
  vi.stubEnv("AUTH_SECRET", "test-secret-that-is-at-least-32-chars");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// pathにアクセスしたときのリクエストを作る。loggedInなら有効なcookieを付ける
async function request(path: string, loggedIn: boolean) {
  const headers = new Headers();

  if (loggedIn) {
    const token = await createSessionToken(new Date(Date.now() + 60_000));
    headers.set("cookie", `${SESSION_COOKIE}=${token}`);
  }

  return new NextRequest(new URL(path, "http://localhost:3000"), { headers });
}

// 次へ進めたか（NextResponse.next()）
function passedThrough(response: Response) {
  return response.headers.get("x-middleware-next") === "1";
}

describe("proxy", () => {
  describe("ログインしていない", () => {
    it("チャット画面を開くと、ログイン画面へ移動させる", async () => {
      const response = await proxy(await request("/", false));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/login",
      );
    });

    it("APIには401（ログインが必要）を返す", async () => {
      const response = await proxy(await request("/api/chat", false));

      expect(response.status).toBe(401);
      expect(await response.text()).toBe("ログインが必要です。");
    });

    it("ログイン画面は開ける", async () => {
      const response = await proxy(await request("/login", false));

      expect(passedThrough(response)).toBe(true);
    });

    it("偽のcookieでは通れない", async () => {
      const req = new NextRequest(new URL("/api/chat", "http://localhost:3000"), {
        headers: { cookie: `${SESSION_COOKIE}=fake-token` },
      });

      expect((await proxy(req)).status).toBe(401);
    });
  });

  describe("ログインしている", () => {
    it("チャット画面を開ける", async () => {
      const response = await proxy(await request("/", true));

      expect(passedThrough(response)).toBe(true);
    });

    it("APIを使える", async () => {
      const response = await proxy(await request("/api/chat", true));

      expect(passedThrough(response)).toBe(true);
    });

    it("ログイン画面を開くと、チャット画面へ移動させる", async () => {
      const response = await proxy(await request("/login", true));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/");
    });
  });
});
