
/**
 * messagesStore
 * -------------
 * Globaler Trigger-Store, um Komponenten/Hooks manuell zum Neuladen/Aktualisieren von Messages zu bewegen.
 *
 * - updateTrigger ist ein Zähler-Signal, das bei jeder triggerUpdate()-Ausführung inkrementiert wird.
 * - Komponenten können auf updateTrigger() reagieren (createEffect) und dadurch z.B. Chats/Messages
 *   erneut aus der DB laden, ohne Props durch viele Ebenen reichen zu müssen.
 */
import { createSignal } from "solid-js";

const [updateTrigger, setUpdateTrigger] = createSignal(0);

export const messagesStore = {
  updateTrigger,
  triggerUpdate: () => setUpdateTrigger(prev => prev + 1),
};
