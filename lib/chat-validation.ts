import { safeValidateUIMessages, type UIMessage } from "ai";

const MAX_LENGTH = 2000;

type ValidationResult =
  | { ok: true; messages: UIMessage[] }
  | { ok: false; error: string };

// ブラウザから届いた内容を、Claude APIへ送る前にサーバー側で再検証する
export async function validateMessages(
  body: unknown,
): Promise<ValidationResult> {
  const invalid = { ok: false, error: "リクエストの形式が正しくありません。" } as const;

  if (typeof body !== "object" || body === null || !("messages" in body)) {
    return invalid;
  }

  const result = await safeValidateUIMessages({ messages: body.messages });

  if (!result.success) {
    return invalid;
  }

  const messages = result.data;

  // systemロールはサーバー側の指示専用なので、ブラウザからは受け付けない
  if (
    messages.some(
      (message) => message.role !== "user" && message.role !== "assistant",
    )
  ) {
    return invalid;
  }

  const current = messages[messages.length - 1];

  if (current.role !== "user") {
    return invalid;
  }

  const text = current.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();

  if (!text) {
    return { ok: false, error: "メッセージが空です。" };
  }

  if (text.length > MAX_LENGTH) {
    return {
      ok: false,
      error: "メッセージは2,000文字以内で入力してください。",
    };
  }

  return { ok: true, messages };
}
