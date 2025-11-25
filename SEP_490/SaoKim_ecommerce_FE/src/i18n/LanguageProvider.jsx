import React, { createContext, useCallback, useContext, useMemo } from "react";
import translations from "./translations";

const DEFAULT_LANGUAGE = "vi";

const LanguageContext = createContext({
  lang: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key) => key,
  formatNumber: (value) => value,
});

const getNestedValue = (obj, path) => {
  if (!obj) return undefined;
  return path.split(".").reduce((acc, part) => (acc ? acc[part] : undefined), obj);
};

const interpolate = (template, params) => {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => (key in params ? params[key] : ""));
};

export function LanguageProvider({ children }) {
  const lang = DEFAULT_LANGUAGE;

  const t = useCallback(
    (key, params) => {
      const candidate = getNestedValue(translations[DEFAULT_LANGUAGE], key);
      if (typeof candidate === "string") {
        return interpolate(candidate, params);
      }
      return typeof key === "string" ? interpolate(key, params) : key;
    },
    [],
  );

  const formatNumber = useCallback(
    (value, options = {}) => {
      if (value === null || value === undefined || Number.isNaN(Number(value))) return "";
      if (options.style === "currency") {
        return new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: options.currency || "VND",
          maximumFractionDigits: options.maximumFractionDigits ?? 0,
          minimumFractionDigits: options.minimumFractionDigits ?? 0,
        }).format(value);
      }
      return new Intl.NumberFormat("vi-VN").format(value);
    },
    [],
  );

  const value = useMemo(
    () => ({
      lang,
      setLanguage: () => {},
      toggleLanguage: () => {},
      t,
      formatNumber,
    }),
    [t, formatNumber],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = () => useContext(LanguageContext);
