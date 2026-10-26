import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Send,
  X,
  MessageSquareText,
  ArrowRight,
  Lightbulb,
} from 'lucide-react';
import type { Dataset, View } from '@/lib/types';
import type { AgentContext, AgentMessage } from '@/lib/agent';
import { answer, buildSuggestions, buildDataSummary, newId } from '@/lib/agent';
import { cn } from '@/components/ui';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

export function AgentPanel({
  open,
  onOpenChange,
  ctx,
  onView,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ctx: AgentContext;
  onView: (v: View) => void;
}) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  // Seed a welcome message once the dataset is available.
  useEffect(() => {
    if (messages.length === 0 && ctx.dataset.rowCount > 0) {
      setMessages([
        {
          id: newId(),
          role: 'agent',
          text: `Hi! I'm the DataStory agent. I've analyzed "${ctx.dataset.name}" — ${ctx.dataset.rowCount.toLocaleString()} rows and ${ctx.dataset.columnCount} columns. Ask me anything about your data, or try one of the suggested questions below.`,
          createdAt: Date.now(),
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.dataset.id]);

  // Reset when dataset changes.
  useEffect(() => {
    setMessages([]);
  }, [ctx.dataset.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  const callAiFallback = useCallback(
    async (question: string, history: AgentMessage[]): Promise<string> => {
      const summary = buildDataSummary(ctxRef.current);
      const recentHistory = history
        .filter((m) => m.text.trim())
        .slice(-6)
        .map((m) => ({ role: m.role === 'user' ? 'user' as const : 'agent' as const, text: m.text }));

      const resp = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ question, summary, history: recentHistory }),
      });

      if (!resp.ok) {
        let msg = 'The AI assistant is unavailable right now.';
        try {
          const errBody = await resp.json();
          if (errBody?.error) msg = errBody.error;
        } catch { /* ignore */ }
        return msg;
      }

      const data = await resp.json();
      if (typeof data.answer === 'string' && data.answer.trim()) {
        return data.answer.trim();
      }
      if (data?.error) return data.error;
      return 'The AI assistant did not produce an answer. Please try rephrasing your question.';
    },
    [],
  );

  const send = (text: string) => {
    const q = text.trim();
    if (!q) return;
    const userMsg: AgentMessage = { id: newId('u'), role: 'user', text: q, createdAt: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setTyping(true);

    // Try the local rule-based agent first (fast, free, no API call).
    const result = answer(q, ctxRef.current);

    if (result.handled !== false && result.text) {
      // Local agent handled it — respond after a brief natural delay.
      const delay = 420 + Math.min(900, q.length * 8);
      setTimeout(() => {
        setTyping(false);
        setMessages((m) => [
          ...m,
          { id: newId('a'), role: 'agent', text: result.text, refs: result.refs, createdAt: Date.now() },
        ]);
      }, delay);
      return;
    }

    // Local agent did not handle it — fall back to the Gemini edge function.
    setMessages((m) => {
      void callAiFallback(q, m).then((aiText) => {
        setTyping(false);
        setMessages((prev) => [
          ...prev,
          { id: newId('a'), role: 'agent', text: aiText, createdAt: Date.now() },
        ]);
      });
      return m;
    });
  };

  const suggestions = buildSuggestions(ctx);

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => onOpenChange(!open)}
        className={cn(
          'no-print fixed bottom-5 right-5 z-50 flex h-14 items-center gap-2 rounded-full bg-ink-900 px-5 text-white shadow-lift transition-all duration-300 hover:bg-ink-800 active:scale-95',
          open && 'opacity-0 pointer-events-none',
        )}
        aria-label="Open data agent"
      >
        <span className="relative flex h-7 w-7 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-indigo-500/40 animate-ping" />
          <Sparkles className="relative h-5 w-5" />
        </span>
        <span className="font-display text-sm font-semibold">Ask the agent</span>
      </button>

      {/* Panel */}
      <div
        className={cn(
          'no-print fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col border-l border-paper-300 bg-white shadow-lift transition-transform duration-300 ease-out sm:rounded-l-3xl',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-paper-300 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-soft">
              <Sparkles className="h-5 w-5" />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-teal-400" />
            </div>
            <div>
              <p className="font-display text-base font-semibold text-ink-900">DataStory Agent</p>
              <p className="text-xs text-ink-500">Answers grounded in your dataset</p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition hover:bg-paper-100 hover:text-ink-900"
            aria-label="Close agent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} onView={onView} />
          ))}
          {typing && <TypingBubble />}

          {/* Suggestions (show when few messages) */}
          {messages.length <= 1 && !typing && (
            <div className="pt-2">
              <p className="mb-2 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-ink-400">
                <Lightbulb className="h-3.5 w-3.5" /> Suggested questions
              </p>
              <div className="flex flex-col gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="group flex items-center justify-between gap-2 rounded-xl border border-paper-300 bg-paper-50/60 px-3.5 py-2.5 text-left text-sm text-ink-700 transition hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    <span>{s}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-ink-300 transition group-hover:text-indigo-500" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-paper-300 p-4">
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-end gap-2"
          >
            <div className="flex flex-1 items-end rounded-2xl border border-paper-300 bg-paper-50/60 px-3 py-2 transition focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={1}
                placeholder="Ask about your data…"
                className="max-h-28 flex-1 resize-none bg-transparent text-sm text-ink-800 placeholder:text-ink-400 focus:outline-none"
                disabled={typing}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || typing}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-soft transition hover:bg-indigo-700 active:scale-95 disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="h-[18px] w-[18px]" />
            </button>
          </form>
          <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[0.68rem] text-ink-400">
            <MessageSquareText className="h-3 w-3" />
            Answers are grounded in your data. Complex questions use AI securely.
          </p>
        </div>
      </div>

      {/* Backdrop on mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink-900/20 backdrop-blur-[1px] lg:hidden"
          onClick={() => onOpenChange(false)}
        />
      )}
    </>
  );
}

function MessageBubble({ message, onView }: { message: AgentMessage; onView: (v: View) => void }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex animate-fade-up', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[88%]', isUser && 'max-w-[80%]')}>
        {!isUser && (
          <div className="mb-1 flex items-center gap-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-600 text-white">
              <Sparkles className="h-3 w-3" />
            </div>
            <span className="text-[0.7rem] font-semibold text-ink-500">Agent</span>
          </div>
        )}
        <div
          className={cn(
            'whitespace-pre-wrap rounded-2xl px-4 py-3 text-[0.875rem] leading-relaxed',
            isUser
              ? 'rounded-br-md bg-ink-900 text-white'
              : 'rounded-bl-md border border-paper-300 bg-white text-ink-700 shadow-soft',
          )}
        >
          {message.text}
        </div>
        {message.refs && message.refs.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.refs.map((r, i) => (
              <button
                key={i}
                onClick={() => r.view && onView(r.view)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
              >
                {r.label}
                {r.view && <ArrowRight className="h-3 w-3" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex animate-fade-in justify-start">
      <div>
        <div className="mb-1 flex items-center gap-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-600 text-white">
            <Sparkles className="h-3 w-3" />
          </div>
          <span className="text-[0.7rem] font-semibold text-ink-500">Agent</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-paper-300 bg-white px-4 py-3.5 shadow-soft">
          <Dot delay="0ms" />
          <Dot delay="160ms" />
          <Dot delay="320ms" />
        </div>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-1.5 w-1.5 rounded-full bg-indigo-400"
      style={{ animation: 'fade-in 0.6s ease-in-out infinite alternate', animationDelay: delay }}
    />
  );
}
