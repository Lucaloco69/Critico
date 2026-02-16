import { createSignal } from "solid-js";

const [directMessageCount, setDirectMessageCount] = createSignal(0);


export const badgeStore = {
  directMessageCount,
  setDirectMessageCount,
};
