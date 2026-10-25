// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { limitHistory } from "@/lib/chat-history";

let count = 0;

function user(text: string): UIMessage {
  return { id: `m${count++}`, role: "user", parts: [{ type: "text", text }] };
}

function assistant(text: string): UIMessage {
  return {
    id: `m${count++}`,
    role: "assistant",
    parts: [{ type: "text", text }],
  };
}

// テスト結果を読みやすくするため、「u:質問 a:回答」の形の文字列にする
function show(messages: UIMessage[]) {
  return messages
    .map(
      (message) =>
        `${message.role[0]}:${message.parts
          .map((part) => (part.type === "text" ? part.text : ""))
          .join("")}`,
    )
    .join(" ");
}

function turns(count: number) {
  const messages: UIMessage[] = [];

  for (let i = 1; i <= count; i++) {
    messages.push(user(`${i}`), assistant(`${i}`));
  }

  return messages;
}

describe("limitHistory", () => {
  it("初回の質問だけなら、そのまま返す", () => {
    expect(show(limitHistory([user("q")]))).toBe("u:q");
  });

  it("空の履歴なら、空の配列を返す", () => {
    expect(limitHistory([])).toEqual([]);
  });

  it("10往復未満なら、すべて送る", () => {
    expect(show(limitHistory([...turns(3), user("q")]))).toBe(
      "u:1 a:1 u:2 a:2 u:3 a:3 u:q",
    );
  });

  it("ちょうど10往復なら、すべて送る", () => {
    expect(limitHistory([...turns(10), user("q")])).toHaveLength(21);
  });

  it("12往復なら、古い2往復を除いて直近10往復を送る", () => {
    const result = show(limitHistory([...turns(12), user("q")]));

    expect(result.startsWith("u:3 a:3")).toBe(true);
    expect(result.endsWith("u:12 a:12 u:q")).toBe(true);
  });

  it("回答がなかった質問（通信失敗など）は送らない", () => {
    const messages = [
      user("1"),
      assistant("1"),
      user("fail"),
      user("2"),
      assistant("2"),
      user("q"),
    ];

    expect(show(limitHistory(messages))).toBe("u:1 a:1 u:2 a:2 u:q");
  });

  it("空の回答は往復に数えない", () => {
    const messages = [
      user("1"),
      assistant("  "),
      user("2"),
      assistant("2"),
      user("q"),
    ];

    expect(show(limitHistory(messages))).toBe("u:2 a:2 u:q");
  });

  it("除外した往復は10往復に数えない", () => {
    const messages = turns(11);
    messages.splice(10, 0, user("fail"));
    messages.push(user("q"));

    const result = limitHistory(messages);

    expect(result).toHaveLength(21);
    expect(show(result).startsWith("u:2 a:2")).toBe(true);
  });
});
