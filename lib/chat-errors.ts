import {
  APICallError,
  LoadAPIKeyError,
  RetryError,
  type UIMessageChunk,
} from "ai";

export const TIMEOUT_MS = 60_000;

const TIMEOUT_MESSAGE =
  "60秒以内に回答が完了しませんでした。再試行してください。";

// エラーの原因を、画面に表示する日本語のメッセージに変換する
// 内部の詳しい情報はブラウザへ渡さず、サーバーのログにだけ残す
export function toErrorMessage(error: unknown): string {
  const cause = RetryError.isInstance(error) ? error.lastError : error;

  if (LoadAPIKeyError.isInstance(cause)) {
    return "APIキーが設定されていません。";
  }

  if (APICallError.isInstance(cause)) {
    const status = cause.statusCode;

    if (status === 401 || status === 403) {
      return "APIキーが正しくないか、利用する権限がありません。";
    }

    if (status === 429) {
      return "リクエストが集中しています。しばらく待ってから再試行してください。";
    }

    if (status !== undefined && status >= 500) {
      return "AIサービスが混み合っているか、一時的に利用できません。しばらく待ってから再試行してください。";
    }
  }

  return "回答の生成中にエラーが発生しました。再試行してください。";
}

// タイムアウトで処理が中断されると、AI SDKは「abort（中断）」を送る
// このままでは画面にエラーが出ないため、「error」に置き換える
export function abortToTimeoutError() {
  return new TransformStream<UIMessageChunk, UIMessageChunk>({
    transform(chunk, controller) {
      if (chunk.type === "abort") {
        controller.enqueue({ type: "error", errorText: TIMEOUT_MESSAGE });
        return;
      }

      controller.enqueue(chunk);
    },
  });
}
