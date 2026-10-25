"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import MessageList from "@/components/MessageList";
import ChatInput from "@/components/ChatInput";
import ChatError from "@/components/ChatError";
import RespondingIndicator from "@/components/RespondingIndicator";

// 回答中にこの時間なにも届かなければ、通信が途切れたと判断する
const STALL_TIMEOUT_MS = 20_000;

// ページの一番下からこの距離以内なら「一番下にいる」とみなす
const BOTTOM_THRESHOLD_PX = 80;

// 途中まで表示された未完成のAI回答を破棄する
// ユーザーの質問は残すので、再試行で同じ質問を送り直せる
function removeUnfinishedAnswer(messages: UIMessage[]) {
  return messages[messages.length - 1]?.role === "assistant"
    ? messages.slice(0, -1)
    : messages;
}

const CONNECTION_ERROR_MESSAGE =
  "通信が途切れました。ネットワーク接続を確認して再試行してください。";

export default function Chat() {
  const [input, setInput] = useState("");
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  // 最大出力トークンの上限で打ち切られた回答のID
  const [truncatedMessageId, setTruncatedMessageId] = useState<string | null>(
    null,
  );
  // 一番下にいるかどうか。画面の表示には使わないため、useStateではなくuseRefで持つ
  const isAtBottomRef = useRef(true);

  const {
    messages,
    sendMessage,
    status,
    error,
    regenerate,
    setMessages,
    stop,
  } = useChat({
    onError: () => {
      setMessages(removeUnfinishedAnswer);
    },
    // 正常に完了した回答には、サーバーから完了の理由（finishReason）が届く
    // 理由がないまま通信が終わった場合は、途中で切れたと判断する
    // （useChatはこの場合をエラーとして扱わないため、自分で検出する）
    onFinish: ({ message, isAbort, isError, finishReason }) => {
      if (isAbort || isError) {
        return;
      }

      // "length"：最大出力トークン（1,024）に達して打ち切られた。エラーではない
      if (finishReason === "length") {
        setTruncatedMessageId(message.id);
        return;
      }

      if (finishReason) {
        return;
      }

      setMessages(removeUnfinishedAnswer);
      setConnectionError(new Error(CONNECTION_ERROR_MESSAGE));
    },
  });
  // 通信の途切れを検出した後は、useChatの状態が戻らなくても回答中として扱わない
  const isResponding =
    (status === "submitted" || status === "streaming") && !connectionError;

  // 回答中は見張りのタイマーを動かす。新しい文字が届く（messagesが変わる）たびにやり直す
  // 通信が切断されずに止まった場合（Wi-Fiの途切れなど）、ブラウザは待ち続けてしまうため
  useEffect(() => {
    if (!isResponding) {
      return;
    }

    const timer = setTimeout(() => {
      stop();
      setMessages(removeUnfinishedAnswer);
      setConnectionError(new Error(CONNECTION_ERROR_MESSAGE));
    }, STALL_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [isResponding, messages, stop, setMessages]);

  const handleSend = () => {
    const text = input.trim();

    if (!text || text.length > 2000 || isResponding) {
      return;
    }

    setConnectionError(null);
    // 自分で送信したときは、過去の会話を見ていても最新の位置へ移動する
    isAtBottomRef.current = true;
    sendMessage({ text });

    setInput("");
  };

  // 最後の質問をもう一度送る（質問は新しく追加しないため、二重登録されない）
  const handleRetry = () => {
    if (isResponding) {
      return;
    }

    setConnectionError(null);
    regenerate();
  };

  const displayError = error ?? connectionError;
  // お知らせは、打ち切られた回答が最新のときだけ表示する（次の質問を送ると消える）
  const isTruncated =
    truncatedMessageId !== null &&
    messages[messages.length - 1]?.id === truncatedMessageId;

  // 回答中で、AIの回答の文字がまだ1文字も届いていない間だけ「回答中」を表示する
  // 文字が届き始めたら、回答の吹き出しが伸びていくので表示を消す
  const lastMessage = messages[messages.length - 1];
  const isWaitingForFirstText =
    isResponding &&
    (lastMessage?.role !== "assistant" ||
      !lastMessage.parts.some(
        (part) => part.type === "text" && part.text !== "",
      ));

  // スクロールされるたびに、一番下にいるかどうかを記録する
  // 過去の会話を見るために上へスクロールすると false、一番下へ戻ると true になる
  useEffect(() => {
    const handleScroll = () => {
      const distanceFromBottom =
        document.documentElement.scrollHeight -
        (window.scrollY + window.innerHeight);
      isAtBottomRef.current = distanceFromBottom <= BOTTOM_THRESHOLD_PX;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 新しい文字・エラー・お知らせが表示されたとき、一番下にいれば最新の位置へ移動する
  useEffect(() => {
    if (isAtBottomRef.current) {
      window.scrollTo({ top: document.documentElement.scrollHeight });
    }
  }, [messages, displayError, isTruncated, isWaitingForFirstText]);

  const displayMessages = messages
    .map((message) => ({
      id: message.id,
      role: message.role,
      content: message.parts
        .map((part) => (part.type === "text" ? part.text : ""))
        .join(""),
    }))
    // 文字が届く前の、中身が空のAIの回答は表示しない（空の吹き出しを出さない）
    .filter((message) => message.content !== "");

  return (
    <>
      <div className="mt-6 min-h-96 rounded-xl border border-violet-100 p-4">
        <MessageList messages={displayMessages} />

        {isWaitingForFirstText && <RespondingIndicator />}

        {isTruncated && !isResponding && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            回答が長いため、途中で終了しました。
          </p>
        )}

        {displayError && !isResponding && (
          <ChatError error={displayError} onRetry={handleRetry} />
        )}
      </div>

      <ChatInput
        input={input}
        onInputChange={setInput}
        onSend={handleSend}
        isResponding={isResponding}
      />
    </>
  );
}
