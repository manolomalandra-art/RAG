"use client";

import { useLang } from "@/context/LangContext";
import { LangCode } from "@/i18n";
import { Globe, X } from "lucide-react";

const flags: Record<LangCode, string> = {
  es: "🇪🇸",
  en: "🇺🇸",
  pt: "🇧🇷",
};

const labels: Record<LangCode, string> = {
  es: "Español",
  en: "English",
  pt: "Português",
};

interface LanguageModalProps {
  open: boolean;
  onClose: () => void;
}

export default function LanguageModal({ open, onClose }: LanguageModalProps) {
  const { lang, setLang, t } = useLang();

  function handleSelect(code: LangCode) {
    setLang(code);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-2xl bg-gray-900 border border-gray-700/60 shadow-2xl p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-xl bg-blue-500/15 p-2.5">
            <Globe className="h-5 w-5 text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-100">{t.selectLang}</h2>
        </div>

        <div className="flex flex-col gap-2">
          {(Object.keys(flags) as LangCode[]).map((code) => (
            <button
              key={code}
              onClick={() => handleSelect(code)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${
                lang === code
                  ? "bg-blue-600/25 border border-blue-500/50 text-blue-200"
                  : "bg-gray-800/60 border border-gray-700/40 text-gray-300 hover:bg-gray-800 hover:border-gray-600"
              }`}
            >
              <span className="text-xl">{flags[code]}</span>
              <span className="text-sm font-medium">{labels[code]}</span>
              {lang === code && (
                <span className="ml-auto text-[11px] text-blue-400 font-semibold tracking-wide uppercase">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
