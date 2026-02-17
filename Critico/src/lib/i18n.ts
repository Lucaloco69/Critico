import { createMemo, createSignal } from "solid-js";
import * as i18n from "@solid-primitives/i18n";

import { dict as de } from "../i18n/de/index";
import { dict as en } from "../i18n/en/index";

import type { dict as enDict } from "../i18n/en/index";

export type Locale = "de" | "en";


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

const _t = i18n.translator(flatDict, i18n.resolveTemplate);

export const t = _t as (
  key: keyof Dictionary,
  params?: Record<string, string | number>,
  defaultValue?: string
) => string;
