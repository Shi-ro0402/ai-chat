"use server";

import { redirect } from "next/navigation";
import { isCorrectPassword } from "@/lib/password";
import { createSession, deleteSession, isAuthConfigured } from "@/lib/session";

// 合言葉を間違えたときに待たせる時間（総当たりで試されにくくする）
const FAILURE_DELAY_MS = 1000;

export type LoginState = { error: string } | undefined;

export async function login(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  if (!isAuthConfigured()) {
    console.error(
      "ログインの設定がありません。.env.localにAPP_PASSWORDとAUTH_SECRET（32文字以上）を設定してください。",
    );
    return { error: "ログインの設定が完了していません。" };
  }

  const password = formData.get("password");

  if (typeof password !== "string" || password === "") {
    return { error: "合言葉を入力してください。" };
  }

  if (!isCorrectPassword(password)) {
    await new Promise((resolve) => setTimeout(resolve, FAILURE_DELAY_MS));
    return { error: "合言葉が正しくありません。" };
  }

  await createSession();
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
