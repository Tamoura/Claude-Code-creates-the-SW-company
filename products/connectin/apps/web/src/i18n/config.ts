import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import arCommon from "./ar/common.json";
import arAuth from "./ar/auth.json";
import enCommon from "./en/common.json";
import enAuth from "./en/auth.json";

const resources = {
  ar: {
    common: arCommon,
    auth: arAuth,
  },
  en: {
    common: enCommon,
    auth: enAuth,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "ar",
    defaultNS: "common",
    ns: ["common", "auth"],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "connectin-lang",
    },
  });

export default i18n;
