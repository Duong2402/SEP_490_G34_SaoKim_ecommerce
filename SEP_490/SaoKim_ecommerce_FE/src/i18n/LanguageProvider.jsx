import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import translations from "./translations";

const DEFAULT_LANGUAGE = "vi";
const STORAGE_KEY = "saokim-lang";

const LanguageContext = createContext({
  lang: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key) => key,
  formatNumber: (value) => value,
});

const numberFormatters = {
  en: new Intl.NumberFormat("en-US"),
  vi: new Intl.NumberFormat("vi-VN"),
};

const getNestedValue = (obj, path) => {
  if (!obj) return undefined;
  return path.split(".").reduce((acc, part) => (acc ? acc[part] : undefined), obj);
};

const interpolate = (template, params) => {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => (key in params ? params[key] : ""));
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && stored in translations) return stored;
    } catch (err) {
      // ignore storage errors
    }
    return DEFAULT_LANGUAGE;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch (err) {
      // ignore storage errors
    }
  }, [lang]);

  const setLanguage = useCallback((next) => {
    if (next in translations) {
      setLang(next);
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLang((prev) => (prev === "en" ? "vi" : "en"));
  }, []);

  const t = useCallback(
    (key, params) => {
      const candidate = getNestedValue(translations[lang], key);
      if (typeof candidate === "string") {
        return interpolate(candidate, params);
      }
      const fallback = getNestedValue(translations.en, key);
      if (typeof fallback === "string") {
        return interpolate(fallback, params);
      }
      return key;
    },
    [lang],
  );

  const formatNumber = useCallback(
    (value, options = {}) => {
      if (value === null || value === undefined || Number.isNaN(Number(value))) return "";
      const formatter = numberFormatters[lang] || numberFormatters.en;
      if (options.style === "currency") {
        return new Intl.NumberFormat(lang === "vi" ? "vi-VN" : "en-US", {
          style: "currency",
          currency: options.currency || "VND",
          maximumFractionDigits: options.maximumFractionDigits ?? 0,
          minimumFractionDigits: options.minimumFractionDigits ?? 0,
        }).format(value);
      }
      return formatter.format(value);
    },
    [lang],
  );

  const value = useMemo(
    () => ({
      lang,
      setLanguage,
      toggleLanguage,
      t,
      formatNumber,
    }),
    [lang, setLanguage, toggleLanguage, t, formatNumber],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
