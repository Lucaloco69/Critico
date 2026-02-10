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
        .in("message_type", ["direct", "request", "request_qr_ready", "request_accepted", "request_declined"])
        .eq("receiver_id", uid)
        .eq("read", false);

      if (error) {
        console.error("❌ HOME: Fehler beim Laden:", error);
        throw error;
      }

      const count = (data || []).length;
      console.log("📬 HOME: Ungelesene Nachrichten gefunden:", count);
      setDirectMessageCount(count);
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
          
          // ✅ FIX: User-specific channel name + remove old channel first
          const channelName = `home-messages-user-${uid}`;
          
          // Remove any existing channel with same name
          const existingChannel = supabase.getChannels().find(ch => ch.topic === channelName);
          if (existingChannel) {
            console.log("🗑️ HOME: Removing existing channel");
            supabase.removeChannel(existingChannel);
          }

          globalHomeMessagesChannel = supabase
            .channel(channelName)
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "Messages",
                filter: `receiver_id=eq.${uid}`,
              },
              (payload) => {
                console.log("🔔 HOME: Messages INSERT Event:", payload.new.message_type);

                if (["direct", "request", "request_qr_ready", "request_accepted", "request_declined"].includes(payload.new.message_type)) {
                  console.log("✅ HOME: Relevante Message, reload count!");
                  setTimeout(() => loadDirectMessageCount(uid), 200); // ✅ Debounce
                }
              }
            )
            .on(
              "postgres_changes",
              {
                event: "UPDATE",
                schema: "public",
                table: "Messages",
                filter: `receiver_id=eq.${uid}`,
              },
              (payload) => {
                console.log("🔔 HOME: Messages UPDATE Event");

                if (payload.old.read !== payload.new.read) {
                  console.log("✅ HOME: Read-Status geändert, reload count!");
                  setTimeout(() => loadDirectMessageCount(uid), 200); // ✅ Debounce
                }
              }
            )
            .subscribe((status, err) => {
              console.log("📡 HOME Messages Channel Status:", status);
              if (err) console.error("❌ HOME Messages Channel Error:", err);
              
              if (status === "SUBSCRIBED") {
                console.log("✅ HOME: Messages Channel erfolgreich verbunden!");
              }
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
