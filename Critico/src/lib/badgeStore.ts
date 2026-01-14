import { createSignal } from "solid-js";

// ✅ Globale Signals außerhalb der Components
const [directMessageCount, setDirectMessageCount] = createSignal(0);
const [requestCount, setRequestCount] = createSignal(0);

export const badgeStore = {
  directMessageCount,
  setDirectMessageCount,
  requestCount,
  setRequestCount,
};
