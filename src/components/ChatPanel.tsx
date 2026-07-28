"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useLang } from "@/context/LangContext";
import { supabase } from "@/lib/supabase";
import { ReportItem } from "@/components/ReportPDF";
import { TribologyRow, FinancialRow } from "@/lib/parseFile";
import { Send, Bot, User, Loader2, MessageCircle } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  reportItems: ReportItem[];
  tribologyData: TribologyRow[];
  financialData: FinancialRow[];
}

function buildContext(
  reportItems: ReportItem[],
  tribologyData: TribologyRow[],
  financialData: FinancialRow[]
): string {
  const sections: string[] = [];

  // 1. Tribology raw data
  if (tribologyData.length > 0) {
    const tribLines = tribologyData.map(
      (r, i) =>
        `[${i + 1}] Family: ${r.family} | Maker: ${r.maker} | Model: ${r.model} | Tag: ${r.tag} | Serial: ${r.serial}\n` +
        `    Compartment: ${r.compartmentName} (${r.compartmentType}) | Hours: ${r.hoursAtSampling} | Site: ${r.site}\n` +
        `    Status: ${r.status} | Evaluation: ${r.evaluation} | Recommendation: ${r.recommendation}`
    );
    sections.push(
      `=== TRIBOLOGY DATA (${tribologyData.length} samples) ===\n${tribLines.join("\n")}`
    );
  }

  // 2. Financial raw data
  if (financialData.length > 0) {
    const finLines = financialData.map(
      (r, i) =>
        `[${i + 1}] Family: ${r.family} | Maker: ${r.maker} | Model: ${r.model} | Compartment: ${r.compartmentType}\n` +
        `    Part: ${r.partName} | Part Cost: R$ ${r.partCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n` +
        `    Labor: ${r.laborHours}h x R$ ${r.laborRate.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} = R$ ${(r.laborHours * r.laborRate).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n` +
        `    Total: R$ ${r.totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
    );
    sections.push(
      `=== FINANCIAL DATA (${financialData.length} parts) ===\n${finLines.join("\n")}`
    );
  }

  // 3. Cross-referenced report (summary)
  if (reportItems.length > 0) {
    const repLines = reportItems.map(
      (item, i) =>
        `[${i + 1}] ${item.equipment} — ${item.compartment} (${item.compartmentType}) | Site: ${item.site} | Tag: ${item.tag} | Serial: ${item.serial}\n` +
        `    Status: ${item.severity} | Cost: R$ ${item.cost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n` +
        `    Breakdown: ${item.costBreakdown}\n` +
        `    Evaluation: ${item.evaluation}\n` +
        `    Recommendation: ${item.recommendation}`
    );
    sections.push(
      `=== CROSS-REFERENCED REPORT (${reportItems.length} equipment-compartment items) ===\n${repLines.join("\n")}`
    );
  }

  return sections.join("\n\n");
}

export default function ChatPanel({
  reportItems,
  tribologyData,
  financialData,
}: ChatPanelProps) {
  const { t, lang } = useLang();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const context = buildContext(reportItems, tribologyData, financialData);
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error: fnError } = await supabase.functions.invoke("chat", {
        body: {
          message: text,
          history,
          context,
          lang,
        },
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error connecting to AI");
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, reportItems, tribologyData, financialData, lang]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="mt-8 rounded-2xl border border-gray-700/50 overflow-hidden bg-gray-900/60">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/60 border-b border-gray-700/50">
        <MessageCircle className="h-4 w-4 text-blue-400" />
        <h3 className="text-sm font-semibold text-gray-200">
          {t.chat?.title || "Chat com IA"}
        </h3>
        <span className="text-[11px] text-gray-500 ml-auto">
          {tribologyData.length} tribologia | {financialData.length} financeiro
        </span>
      </div>

      {/* Messages */}
      <div className="h-80 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="h-8 w-8 text-gray-600 mb-2" />
            <p className="text-xs text-gray-500 max-w-xs">
              {t.chat?.empty || "Faça perguntas sobre os dados dos equipamentos, custos, status de saúde, ou recomendações de manutenção."}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="shrink-0 mt-1 rounded-lg bg-blue-600/20 p-1.5">
                <Bot className="h-3.5 w-3.5 text-blue-400" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-200 border border-gray-700/50"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
            {msg.role === "user" && (
              <div className="shrink-0 mt-1 rounded-lg bg-gray-700/50 p-1.5">
                <User className="h-3.5 w-3.5 text-gray-400" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="shrink-0 mt-1 rounded-lg bg-blue-600/20 p-1.5">
              <Bot className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <div className="rounded-xl px-3 py-2 bg-gray-800 border border-gray-700/50">
              <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-950/40 border border-red-700/30 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-700/50 px-4 py-3">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.chat?.placeholder || "Digite sua pergunta..."}
            rows={1}
            className="flex-1 resize-none rounded-xl bg-gray-800 border border-gray-700/50 px-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="shrink-0 rounded-xl bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
