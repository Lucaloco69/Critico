import { createSignal } from "solid-js";


// ✅ Globales Signal für Messages (inkl. Requests)
const [directMessageCount, setDirectMessageCount] = createSignal(0);


export const badgeStore = {
  directMessageCount,
  setDirectMessageCount,
};
