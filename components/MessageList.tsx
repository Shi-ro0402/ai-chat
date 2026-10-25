type Message = {
  id: string;
  role: string;
  content: string;
};

type MessageListProps = {
  messages: Message[];
};

export default function MessageList({
  messages,
}: MessageListProps) {
  return (
    <div className="flex flex-col gap-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={
            message.role === "user"
              ? "flex justify-end"
              : "flex justify-start"
          }
        >
          <div
            className={
              message.role === "user"
                ? "max-w-[80%] rounded-2xl bg-linear-to-br from-violet-600 to-purple-600 p-3 text-left text-white shadow-sm whitespace-pre-wrap break-words"
                : "max-w-[80%] rounded-2xl bg-violet-50 p-3 text-left text-gray-900 ring-1 ring-violet-100 whitespace-pre-wrap break-words"
            }
          >
            {message.content}
          </div>
        </div>
      ))}
    </div>
  );
}