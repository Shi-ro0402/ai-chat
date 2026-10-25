import type { UIMessage } from "ai";

const MAX_TURNS = 10;

function hasText(message: UIMessage) {
  return message.parts.some(
    (part) => part.type === "text" && part.text.trim() !== "",
  );
}

// Claude APIへ送る履歴を「正常に完了した直近10往復＋今回の質問」に絞る
export function limitHistory(messages: UIMessage[]): UIMessage[] {
  const current = messages[messages.length - 1];

  if (!current) {
    return [];
  }

  const previous = messages.slice(0, -1);
  const turns: UIMessage[][] = [];

  for (let i = 0; i < previous.length - 1; i++) {
    const user = previous[i];
    const assistant = previous[i + 1];

    if (
      user.role === "user" &&
      assistant.role === "assistant" &&
      hasText(assistant)
    ) {
      turns.push([user, assistant]);
      i++;
    }
  }

  return [...turns.slice(-MAX_TURNS).flat(), current];
}
