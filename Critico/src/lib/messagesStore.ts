import { createSignal } from "solid-js";

const [updateTrigger, setUpdateTrigger] = createSignal(0);

export const messagesStore = {
  updateTrigger,
  triggerUpdate: () => setUpdateTrigger(prev => prev + 1),
};
