import { onMount, onCleanup, Accessor } from "solid-js";
import { supabase } from "../../lib/supabaseClient";
import { badgeStore } from "../../lib/badgeStore";

let globalHomeMessagesChannel: any = null;

export function useRealtimeMessages(userId: Accessor<number | null>) {
  const { setDirectMessageCount } = badgeStore;

  const loadDirectMessageCount = async (uid: number) => {
    try {
      console.log("📊 HOME: Lade ungelesene Nachrichten für User:", uid);

      const { data, error } = await supabase
        .from("Messages")
        .select("id, sender_id, receiver_id, read, message_type")
        .in("message_type", ["direct", "request"])
        .eq("receiver_id", uid)
        .eq("read", false)
        .neq("sender_id", uid);

      if (error) {
        console.error("❌ HOME: Fehler beim Laden:", error);
        throw error;
      }

      console.log("📬 HOME: Ungelesene Nachrichten gefunden:", (data || []).length);
      setDirectMessageCount((data || []).length);
    } catch (err) {
      console.error("Error loading direct message count:", err);
    }
  };

  onMount(() => {
    const checkUserAndSetup = setInterval(() => {
      const uid = userId();
      if (uid) {
        clearInterval(checkUserAndSetup);

        console.log("🚀 HOME: Setup Realtime für Messages, User:", uid);

        // Initial laden
        loadDirectMessageCount(uid);

        if (!globalHomeMessagesChannel) {
          console.log("🔌 HOME: Creating Messages Channel");
          globalHomeMessagesChannel = supabase
            .channel("home_messages_changes")
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "Messages",
                filter: `receiver_id=eq.${uid}`,
              },
              (payload) => {
                console.log("🔔 HOME: Messages Event empfangen:", payload.eventType);

                if (payload.new.message_type === "direct" || payload.new.message_type === "request") {
                  loadDirectMessageCount(uid);
                }
              }
            )
            .subscribe((status) => {
              console.log("📡 HOME Messages Channel Status:", status);
            });
        }
      }
    }, 100);

    setTimeout(() => clearInterval(checkUserAndSetup), 10000);
  });

  onCleanup(() => {
    console.log("🧹 HOME: Cleanup Messages Channel");
    if (globalHomeMessagesChannel) {
      supabase.removeChannel(globalHomeMessagesChannel);
      globalHomeMessagesChannel = null;
    }
  });
}
