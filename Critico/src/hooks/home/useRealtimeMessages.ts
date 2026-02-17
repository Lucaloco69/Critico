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

  const setupSubscription = (uid: number) => {
    if (globalHomeMessagesChannel) return;

    loadDirectMessageCount(uid);

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
  };

  const cleanupChannel = () => {
    if (globalHomeMessagesChannel) {
      supabase.removeChannel(globalHomeMessagesChannel);
      globalHomeMessagesChannel = null;
    }
  };

  onMount(() => {
    let checkUserAndSetup: number | undefined;

    const trySetup = () => {
      const uid = userId();
      if (uid) {
        setupSubscription(uid);
        return true;
      }
      return false;
    };

    if (!trySetup()) {
      checkUserAndSetup = window.setInterval(() => {
        if (trySetup()) {
          clearInterval(checkUserAndSetup);
        }
      }, 100);

      setTimeout(() => clearInterval(checkUserAndSetup), 10000);
    }

    const onPageHide = () => {
      cleanupChannel();
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        trySetup();
      }
    };

    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);

    onCleanup(() => {
      if (checkUserAndSetup) clearInterval(checkUserAndSetup);
      cleanupChannel();
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
    });
  });
}
