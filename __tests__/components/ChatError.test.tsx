import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { APICallError } from "ai";
import ChatError from "@/components/ChatError";

function apiError(statusCode: number, message: string) {
  return new APICallError({
    message,
    url: "/api/chat",
    requestBodyValues: {},
    statusCode,
  });
}

describe("ChatError", () => {
  it("ネットワークの切断（TypeError）", () => {
    render(
      <ChatError error={new TypeError("Failed to fetch")} onRetry={vi.fn()} />,
    );

    expect(
      screen.getByText(
        "通信に失敗しました。ネットワーク接続を確認して再試行してください。",
      ),
    ).toBeDefined();
  });

  it("入力検証のエラー（400）は、サーバーのメッセージを表示する", () => {
    render(
      <ChatError
        error={apiError(400, "メッセージが空です。")}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText("メッセージが空です。")).toBeDefined();
  });

  it("回数制限（429）は、サーバーのメッセージを表示する", () => {
    const message =
      "短時間に送信できる回数（10分間に5回）を超えました。約3分後に再試行してください。";

    render(<ChatError error={apiError(429, message)} onRetry={vi.fn()} />);

    expect(screen.getByText(message)).toBeDefined();
  });

  it("ログインの期限切れ（401）", () => {
    render(
      <ChatError error={apiError(401, "ログインが必要です。")} onRetry={vi.fn()} />,
    );

    expect(
      screen.getByText(
        "ログインの有効期限が切れました。ページを再読み込みして、もう一度ログインしてください。",
      ),
    ).toBeDefined();
  });

  it("その他のサーバーエラーは、内部の情報を表示しない", () => {
    render(
      <ChatError
        error={apiError(500, "<html>Internal Server Error</html>")}
        onRetry={vi.fn()}
      />,
    );

    expect(
      screen.getByText("サーバーでエラーが発生しました。再試行してください。"),
    ).toBeDefined();
    expect(screen.queryByText(/Internal Server Error/)).toBeNull();
  });

  it("回答中のエラーは、サーバーが作ったメッセージを表示する", () => {
    render(
      <ChatError
        error={new Error("APIキーが設定されていません。")}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText("APIキーが設定されていません。")).toBeDefined();
  });

  it("再試行ボタンを押すと、onRetryを呼ぶ", () => {
    const onRetry = vi.fn();

    render(<ChatError error={new Error("エラー")} onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "再試行" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
