import React, { createContext, useContext, useState, useCallback } from "react";
import en, { Translations } from "./en";
import zh from "./zh";
import ja from "./ja";

export type Language = "en" | "zh" | "ja";

const translations: Record<Language, Translations> = { en, zh, ja };

function getNested(obj: any, path: string): string {
  return path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj) ?? path;
}

interface LanguageContextType {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: string, ...args: string[]) => string;
  tCard: (id: string) => { name: string; desc: string };
  tEnemyName: (name: string) => string;
  tRelic: (id: string) => { name: string; desc: string };
  tPotion: (id: string) => { name: string; desc: string };
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en", setLang: () => {}, t: (k: string) => k,
  tCard: () => ({ name: "", desc: "" }), tEnemyName: (n) => n,
  tRelic: () => ({ name: "", desc: "" }), tPotion: () => ({ name: "", desc: "" }),
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const saved = (localStorage.getItem("shadowdeck_lang") as Language) || "en";
  const [lang, setLangState] = useState<Language>(saved);

  const setLang = useCallback((l: Language) => {
    localStorage.setItem("shadowdeck_lang", l);
    setLangState(l);
  }, []);

  const tr = translations[lang];

  const t = useCallback((key: string, ...args: string[]) => {
    let val = getNested(tr, key);
    args.forEach((arg, i) => { val = val.replace(`{${i}}`, arg); });
    return val;
  }, [tr]);

  const tCard = useCallback((id: string) => {
    return (tr.cards as any)[id] || { name: id, desc: "" };
  }, [tr]);

  const tEnemyName = useCallback((name: string) => {
    return (tr.enemies as any)[name] || name;
  }, [tr]);

  const tRelic = useCallback((id: string) => {
    return (tr.relics as any)[id] || { name: id, desc: "" };
  }, [tr]);

  const tPotion = useCallback((id: string) => {
    return (tr.potions as any)[id] || { name: id, desc: "" };
  }, [tr]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tCard, tEnemyName, tRelic, tPotion }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useT() { return useContext(LanguageContext); }
export { translations };
export type { Translations };
