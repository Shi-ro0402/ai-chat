import { APICallError } from "ai";

type ChatErrorProps = {
  error: Error;
  onRetry: () => void;
};

// エラーの種類に応じて、画面に表示するメッセージを決める
function getErrorMessage(error: Error) {
  // サーバーに届かなかった（ネットワークの切断など）
  if (error instanceof TypeError) {
    return "通信に失敗しました。ネットワーク接続を確認して再試行してください。";
  }

  if (APICallError.isInstance(error)) {
    // 400：サーバー側の入力検証で弾かれた
    // 429：10分間に送れる回数を超えた
    // （どちらもメッセージはサーバーが作成）
    if (error.statusCode === 400 || error.statusCode === 429) {
      return error.message;
    }

    // 401：ログインの有効期限が切れた
    if (error.statusCode === 401) {
      return "ログインの有効期限が切れました。ページを再読み込みして、もう一度ログインしてください。";
    }

    return "サーバーでエラーが発生しました。再試行してください。";
  }

  // 回答の途中で発生したエラー（メッセージはサーバーのtoErrorMessageが作成）
  return error.message;
}

export default function ChatError({ error, onRetry }: ChatErrorProps) {
  return (
    <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <p>{getErrorMessage(error)}</p>

      <button
        onClick={onRetry}
        className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-white"
      >
        再試行
      </button>
    </div>
  );
}
