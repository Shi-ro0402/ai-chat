import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "ログイン | Simple AI Chat",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-linear-to-br from-violet-400 via-fuchsia-300 to-orange-200 p-4">
      <div className="mx-auto mt-16 max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h1 className="bg-linear-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-2xl font-bold text-transparent">
          ✦ Simple AI Chat
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          合言葉を入力してください。
        </p>

        <LoginForm />
      </div>
    </main>
  );
}
