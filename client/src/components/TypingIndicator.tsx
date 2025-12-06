/**
 * Typing Indicator Component
 * Shows animated dots (•••) while AI is typing
 */
export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-2">
      <span className="typing-dot animate-bounce" style={{ animationDelay: "0ms" }}>
        •
      </span>
      <span className="typing-dot animate-bounce" style={{ animationDelay: "150ms" }}>
        •
      </span>
      <span className="typing-dot animate-bounce" style={{ animationDelay: "300ms" }}>
        •
      </span>
    </div>
  );
}
