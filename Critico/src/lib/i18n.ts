// src/lib/i18n.ts
import { createMemo, createSignal } from "solid-js";
import * as i18n from "@solid-primitives/i18n";

import { dict as de } from "../i18n/de/index";
import { dict as en } from "../i18n/en/index";

// type-only: EN bestimmt die Key-Struktur
import type { dict as enDict } from "../i18n/en/index";

export type Locale = "de" | "en";

/**
 * WidenLeaves:
 * - behält die Objekt-STRUKTUR (Keys) exakt bei,
 * - aber macht String-Literal-Values zu `string`,
 *   damit DE-Texte nicht exakt den EN-Literal-Text matchen müssen.
 */
type WidenLeaves<T> =
  T extends string ? string :
  T extends number ? number :
  T extends boolean ? boolean :
  T extends readonly (infer U)[] ? readonly WidenLeaves<U>[] :
  T extends object ? { [K in keyof T]: WidenLeaves<T[K]> } :
  T;

export type RawDictionary = WidenLeaves<typeof enDict>;
export type Dictionary = i18n.Flatten<RawDictionary>;

const dictionaries: Record<Locale, RawDictionary> = { de, en };

const stored = (typeof window !== 'undefined' ? localStorage.getItem("locale") as Locale | null : null) ?? "de";
export const [locale, _setLocale] = createSignal<Locale>(stored);

export const setLocale = (l: Locale) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem("locale", l);
  }
  _setLocale(l);
};

const flatDict = createMemo<Dictionary>(() => i18n.flatten(dictionaries[locale()]));

// resolveTemplate aktivieren für {{ placeholders }}
const _t = i18n.translator(flatDict, i18n.resolveTemplate);

// Explizit: t gibt immer string zurück (nie Objekt-Union)
export const t = _t as (
  key: keyof Dictionary,
  params?: Record<string, string | number>,
  defaultValue?: string
) => string;
