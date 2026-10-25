// AIの回答の最初の文字が届くまで、左側（AIの吹き出しの位置）に表示する
export default function RespondingIndicator() {
  return (
    <div className="mt-4 flex justify-start">
      <div
        role="status"
        className="flex items-center gap-2 rounded-2xl bg-violet-50 px-4 py-3 text-sm text-violet-700 ring-1 ring-violet-100"
      >
        <span>回答中</span>

        {/* 動く3つの点。「アニメーションを減らす」設定の人には動かさない（motion-safe） */}
        <span aria-hidden="true" className="flex gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400 motion-safe:animate-bounce" />
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400 motion-safe:animate-bounce [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400 motion-safe:animate-bounce [animation-delay:300ms]" />
        </span>
      </div>
    </div>
  );
}
