import { createMemo, createSignal } from "solid-js";
import * as i18n from "@solid-primitives/i18n";

import { dict as de } from "../i18n/de";
import { dict as en } from "../i18n/en";

export type Locale = "de" | "en";

const dictionaries = { de, en } as const;

const stored = (localStorage.getItem("locale") as Locale | null) ?? "de";
export const [locale, _setLocale] = createSignal<Locale>(stored);

export const setLocale = (l: Locale) => {
  localStorage.setItem("locale", l);
  _setLocale(l);
};

const flatDict = createMemo(() => i18n.flatten(dictionaries[locale()]));

// Kein “: (key: string) => string” hier!
export const t = i18n.translator(flatDict, i18n.resolveTemplate);
