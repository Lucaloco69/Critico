import { onMount, onCleanup, Accessor } from "solid-js";
import { supabase } from "../../lib/supabaseClient";
import { badgeStore } from "../../lib/badgeStore";

let globalHomeMessagesChannel: any = null;

export function useRealtimeMessages(userId: Accessor<number | null>) {
  const { setDirectMessageCount } = badgeStore;

  const loadDirectMessageCount = async (uid: number) => {
    try {
      const { data, error } = await supabase
        .from("Messages")
        .select("id")
        .in("message_type", ["direct", "request", "request_qr_ready", "request_accepted", "request_declined"])
        .eq("receiver_id", uid)
        .eq("read", false);

      if (error) throw error;
      setDirectMessageCount((data || []).length);
    } catch (err) {
      console.error("Error loading message count:", err);
    }
  };

  onMount(() => {
    const checkUserAndSetup = setInterval(() => {
      const uid = userId();
      if (uid) {
        clearInterval(checkUserAndSetup);

        loadDirectMessageCount(uid);

        if (!globalHomeMessagesChannel) {
          const channelName = `home-messages-user-${uid}`;
          
          const existingChannel = supabase.getChannels().find(ch => ch.topic === channelName);
          if (existingChannel) {
            supabase.removeChannel(existingChannel);
          }

          globalHomeMessagesChannel = supabase
            .channel(channelName)
            .on(
              "postgres_changes",
              { event: "INSERT", schema: "public", table: "Messages", filter: `receiver_id=eq.${uid}` },
              (payload) => {
                if (["direct", "request", "request_qr_ready", "request_accepted", "request_declined"].includes(payload.new.message_type)) {
                  setTimeout(() => loadDirectMessageCount(uid), 200);
                }
              }
            )
            .on(
              "postgres_changes",
              { event: "UPDATE", schema: "public", table: "Messages", filter: `receiver_id=eq.${uid}` },
              (payload) => {
                if (payload.old.read !== payload.new.read) {
                  setTimeout(() => loadDirectMessageCount(uid), 200);
                }
              }
            )
            .subscribe();
        }
      }
    }, 100);

    setTimeout(() => clearInterval(checkUserAndSetup), 10000);
  });

  onCleanup(() => {
    if (globalHomeMessagesChannel) {
      supabase.removeChannel(globalHomeMessagesChannel);
      globalHomeMessagesChannel = null;
    }
  });
}
