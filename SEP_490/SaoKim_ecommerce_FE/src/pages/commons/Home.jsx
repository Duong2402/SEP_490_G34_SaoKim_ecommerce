import React from "react";
import { useLanguage } from "../../i18n/LanguageProvider.jsx";

export default function Home() {
  const { t } = useLanguage();

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h1>{t("home.title")}</h1>
      <p>{t("home.subtitle")}</p>
    </div>
  );
}
