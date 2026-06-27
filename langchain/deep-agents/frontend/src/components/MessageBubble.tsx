import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User } from "lucide-react";
import type { ChatMessage } from "../types";
import { toDisplayString } from "../utils/format";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const content = toDisplayString(message.content);

  return (
    <div
      className={`animate-slide-up flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div
        className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          isUser
            ? "bg-indigo-500/15 text-indigo-300"
            : "bg-emerald-500/15 text-emerald-300"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? "rounded-tr-md bg-indigo-500/10 ring-1 ring-indigo-500/20"
            : "rounded-tl-md bg-surface-800/90 ring-1 ring-white/5"
        }`}
      >
        <div className="prose-chat text-sm text-slate-200">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
