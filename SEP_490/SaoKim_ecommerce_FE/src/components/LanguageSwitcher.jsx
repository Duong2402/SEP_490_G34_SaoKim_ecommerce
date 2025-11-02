import React from "react";
import { useLanguage } from "../i18n/LanguageProvider";
import translations from "../i18n/translations";

export default function LanguageSwitcher() {
  const { lang, setLanguage, t } = useLanguage();

  return (
    <div className="language-switcher">
      <label htmlFor="language-select" className="language-switcher__label">
        {t("language.switchLabel")}
      </label>
      <select
        id="language-select"
        className="language-switcher__select"
        value={lang}
        onChange={(event) => setLanguage(event.target.value)}
      >
        {Object.entries(translations).map(([code, dictionary]) => (
          <option key={code} value={code}>
            {dictionary.language?.[code === "en" ? "english" : "vietnamese"] ?? code}
          </option>
        ))}
      </select>
    </div>
  );
}
