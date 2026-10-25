import Chat from "@/components/Chat";
import { logout } from "@/app/login/actions";

export default function Home() {
  return (
    <main className="min-h-screen bg-linear-to-br from-violet-400 via-fuchsia-300 to-orange-200 p-4">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="bg-linear-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-2xl font-bold text-transparent">
              ✦ Simple AI Chat
            </h1>

            <p className="mt-2 text-sm font-medium text-violet-500">
              Claude Haiku 5.5
            </p>
          </div>

          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg px-3 py-1.5 text-sm text-violet-600 ring-1 ring-violet-200 hover:bg-violet-50"
            >
              ログアウト
            </button>
          </form>
        </div>

        <Chat />
      </div>
    </main >
  );
}
