import type { Language } from "../store/language-context";

export function getCurrentLanguage(fallback: Language = "es"): Language {
  if (typeof document !== "undefined") {
    const lang = document.documentElement.lang?.trim().toLowerCase();
    if (lang === "en") {
      return "en";
    }
    if (lang === "es") {
      return "es";
    }
  }

  return fallback;
}

export function getCurrentLocale(language?: Language): string {
  return (language || getCurrentLanguage()) === "en" ? "en-US" : "es-CL";
}

export function pickLanguage<T>(
  options: Record<Language, T>,
  language?: Language
): T {
  return options[language || getCurrentLanguage()];
}
