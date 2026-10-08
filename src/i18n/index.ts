import { createI18n } from 'vue-i18n';
import en from './locales/en';
import ar from './locales/ar';

export type AppLocale = 'en' | 'ar';

const STORAGE_KEY = 'zineMaker.locale';

function initialLocale(): AppLocale {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'en' || saved === 'ar') return saved;
  return navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

// CLDR plural categories for Arabic mapped onto pipe-separated choices:
// zero | one | two | few (3–10) | many (11–99) | other
function arabicPluralRule(choice: number, choicesLength: number): number {
  const n = Math.abs(choice);
  if (n === 0) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  const mod100 = n % 100;
  if (mod100 >= 3 && mod100 <= 10) return 3;
  if (mod100 >= 11 && mod100 <= 99) return 4;
  return choicesLength > 5 ? 5 : choicesLength - 1;
}

export function applyLocaleDirection(locale: AppLocale): void {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
}

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: 'en',
  messages: { en, ar },
  pluralRules: { ar: arabicPluralRule },
});

export function setLocale(locale: AppLocale): void {
  i18n.global.locale.value = locale;
  localStorage.setItem(STORAGE_KEY, locale);
  applyLocaleDirection(locale);
}
