import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/session";

// ページやAPIが動く前に、ログインしているかを確かめる
export async function proxy(request: NextRequest) {
  const isLoggedIn = await isValidSessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
  );
  const { pathname } = request.nextUrl;

  // ログイン画面：ログイン済みならチャット画面へ
  if (pathname === "/login") {
    return isLoggedIn
      ? NextResponse.redirect(new URL("/", request.url))
      : NextResponse.next();
  }

  if (isLoggedIn) {
    return NextResponse.next();
  }

  // ログインしていない：APIには401（ログインが必要）を返し、ページはログイン画面へ
  if (pathname.startsWith("/api/")) {
    return new NextResponse("ログインが必要です。", { status: 401 });
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // 画像やCSSなど、Next.jsが配信するファイルは対象外にする
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
