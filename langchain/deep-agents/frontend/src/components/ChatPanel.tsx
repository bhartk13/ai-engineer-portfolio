import {
  ArrowUp,
  Loader2,
  SendHorizonal,
  Square,
} from "lucide-react";
import { useEffect, useRef } from "react";
import type { ChatMessage } from "../types";
import { MessageBubble } from "./MessageBubble";
import { SuggestedPrompts } from "./Header";

export function ChatPanel({
  messages,
  isRunning,
  onSend,
  onStop,
}: {
  messages: ChatMessage[];
  isRunning: boolean;
  onSend: (prompt: string) => void;
  onStop: () => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isRunning]);

  const submit = () => {
    const value = inputRef.current?.value.trim();
    if (!value || isRunning) return;
    onSend(value);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-3xl border border-white/5 bg-surface-900/70 shadow-2xl shadow-black/20">
      <div className="border-b border-white/5 px-5 py-4">
        <h2 className="text-sm font-semibold text-white">Orchestrator chat</h2>
        <p className="text-xs text-slate-400">
          Plan · delegate · load skills · collaborate via workspace
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {messages.length === 0 ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-dashed border-white/10 bg-surface-850/40 p-8 text-center">
              <p className="text-sm text-slate-400">
                Ask the team to research, write, or review. Agents coordinate
                through SKILL.md workflows and shared files.
              </p>
            </div>
            <SuggestedPrompts onSelect={onSend} disabled={isRunning} />
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}

        {isRunning && (
          <div className="flex items-center gap-2 text-sm text-emerald-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Agents are working…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-white/5 p-4">
        <div className="flex items-end gap-3 rounded-2xl border border-white/10 bg-surface-850/80 p-3 ring-1 ring-white/5 focus-within:border-emerald-500/40 focus-within:ring-emerald-500/20">
          <textarea
            ref={inputRef}
            rows={2}
            placeholder="Ask the team to research, write, or review…"
            disabled={isRunning}
            className="max-h-40 min-h-[52px] flex-1 resize-none bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500 disabled:opacity-60"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          {isRunning ? (
            <button
              type="button"
              onClick={onStop}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300 transition hover:bg-rose-500/25"
              aria-label="Stop"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-400"
              aria-label="Send"
            >
              <SendHorizonal className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
          <ArrowUp className="h-3 w-3 rotate-90" />
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </section>
  );
}
