import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ChatInput from "@/components/ChatInput";

// ChatInputを表示し、操作に必要な要素と偽の関数を返す
function setup({ input = "こんにちは", isResponding = false } = {}) {
  const onInputChange = vi.fn();
  const onSend = vi.fn();

  render(
    <ChatInput
      input={input}
      onInputChange={onInputChange}
      onSend={onSend}
      isResponding={isResponding}
    />,
  );

  return {
    textarea: screen.getByPlaceholderText<HTMLTextAreaElement>(
      "メッセージを入力...",
    ),
    button: screen.getByRole<HTMLButtonElement>("button", { name: "送信" }),
    onInputChange,
    onSend,
  };
}

describe("ChatInput", () => {
  describe("キー操作", () => {
    it("Enterで送信する", () => {
      const { textarea, onSend } = setup();

      fireEvent.keyDown(textarea, { key: "Enter" });

      expect(onSend).toHaveBeenCalledTimes(1);
    });

    it("Shift+Enterでは送信しない（改行になる）", () => {
      const { textarea, onSend } = setup();

      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

      expect(onSend).not.toHaveBeenCalled();
    });

    it("日本語変換中のEnterでは送信しない", () => {
      const { textarea, onSend } = setup();

      fireEvent.keyDown(textarea, { key: "Enter", isComposing: true });

      expect(onSend).not.toHaveBeenCalled();
    });

    it("Enter以外のキーでは送信しない", () => {
      const { textarea, onSend } = setup();

      fireEvent.keyDown(textarea, { key: "a" });

      expect(onSend).not.toHaveBeenCalled();
    });
  });

  describe("入力欄", () => {
    it("入力した内容を親へ伝える", () => {
      const { textarea, onInputChange } = setup({ input: "" });

      fireEvent.change(textarea, { target: { value: "質問" } });

      expect(onInputChange).toHaveBeenCalledWith("質問");
    });

    it("最大2,000文字まで", () => {
      const { textarea } = setup();

      expect(textarea.maxLength).toBe(2000);
    });
  });

  describe("送信ボタン", () => {
    it("クリックで送信する", () => {
      const { button, onSend } = setup();

      fireEvent.click(button);

      expect(onSend).toHaveBeenCalledTimes(1);
    });

    it.each([
      ["空欄", ""],
      ["空白のみ", "   "],
      ["改行のみ", "\n\n"],
    ])("%sのときは押せない", (_, input) => {
      const { button } = setup({ input });

      expect(button.disabled).toBe(true);
    });

    it("AIの回答中は押せない", () => {
      const { button } = setup({ isResponding: true });

      expect(button.disabled).toBe(true);
    });

    it("文字があり、回答中でなければ押せる", () => {
      const { button } = setup();

      expect(button.disabled).toBe(false);
    });
  });
});
