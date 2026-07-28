"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { translations, LangCode, Translation } from "@/i18n";

interface LangContextType {
  lang: LangCode;
  t: Translation;
  setLang: (l: LangCode) => void;
}

const LangContext = createContext<LangContextType>({
  lang: "es",
  t: translations.es,
  setLang: () => {},
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<LangCode>("es");
  return (
    <LangContext.Provider value={{ lang, t: translations[lang], setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
