type ChatInputProps = {
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  isResponding: boolean;
};

const MAX_LENGTH = 2000;

export default function ChatInput({
  input,
  onInputChange,
  onSend,
  isResponding,
}: ChatInputProps) {
  return (
    <div className="mt-4 flex gap-2">
      <textarea
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            onSend();
          }
        }}
        value={input}
        onChange={(event) => onInputChange(event.target.value)}
        maxLength={MAX_LENGTH}
        placeholder="メッセージを入力..."
        className="flex-1 rounded-xl border border-violet-200 p-3 text-gray-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
      />

      <button
        onClick={onSend}
        disabled={!input.trim() || isResponding}
        className="rounded-xl bg-linear-to-r from-violet-600 to-purple-600 px-5 font-semibold text-white shadow-sm hover:from-violet-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none"
      >
        送信
      </button>
    </div>
  );
}
