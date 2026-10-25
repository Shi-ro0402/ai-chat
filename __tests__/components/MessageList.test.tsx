import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import MessageList from "@/components/MessageList";

describe("MessageList", () => {
  it("メッセージを順番どおりに表示する", () => {
    render(
      <MessageList
        messages={[
          { id: "1", role: "user", content: "1つ目" },
          { id: "2", role: "assistant", content: "2つ目" },
          { id: "3", role: "user", content: "3つ目" },
        ]}
      />,
    );

    const texts = screen
      .getAllByText(/つ目/)
      .map((element) => element.textContent);

    expect(texts).toEqual(["1つ目", "2つ目", "3つ目"]);
  });

  it("ユーザーのメッセージは右側に表示する", () => {
    render(
      <MessageList messages={[{ id: "1", role: "user", content: "質問" }]} />,
    );

    expect(screen.getByText("質問").parentElement?.className).toContain(
      "justify-end",
    );
  });

  it("AIのメッセージは左側に表示する", () => {
    render(
      <MessageList
        messages={[{ id: "1", role: "assistant", content: "回答" }]}
      />,
    );

    expect(screen.getByText("回答").parentElement?.className).toContain(
      "justify-start",
    );
  });

  it("改行を保ったまま表示する", () => {
    render(
      <MessageList
        messages={[{ id: "1", role: "user", content: "1行目\n2行目" }]}
      />,
    );

    const bubble = screen.getByText(/1行目/);

    expect(bubble.textContent).toBe("1行目\n2行目");
    expect(bubble.className).toContain("whitespace-pre-wrap");
  });

  it("メッセージがなければ何も表示しない", () => {
    const { container } = render(<MessageList messages={[]} />);

    expect(container.textContent).toBe("");
  });
});
