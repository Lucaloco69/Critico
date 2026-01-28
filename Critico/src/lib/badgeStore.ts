/**
 * badgeStore
 * ----------
 * Kleiner globaler Store (Signal) für Badge-Zähler in der UI.
 *
 * - Hält aktuell die Anzahl ungelesener Direktnachrichten (directMessageCount).
 * - setDirectMessageCount wird von Hooks/Pages (z.B. useMessages) gesetzt und von UI-Komponenten
 *   (z.B. HeaderActions) gelesen, um ein Badge (Counter) anzuzeigen.
 */

import { createSignal } from "solid-js";

const [directMessageCount, setDirectMessageCount] = createSignal(0);


export const badgeStore = {
  directMessageCount,
  setDirectMessageCount,
};
