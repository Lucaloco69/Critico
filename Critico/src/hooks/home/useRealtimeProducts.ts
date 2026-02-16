import { onCleanup, Accessor, createEffect } from "solid-js";
import { supabase } from "../../lib/supabaseClient";

let globalHomeProductsChannel: any = null;
let pendingProductUpdates = new Set<number>();

export function useRealtimeProducts(
  userId: Accessor<number | null>,
  onProductsChange: () => void,
  onProductCommentAdded?: (productId: number) => void
) {
  createEffect(() => {
    const uid = userId();
    if (!uid) return;

    let retryTimeout: any;

    const setupChannel = () => {
      // CLEANUP: If we have an existing channel, remove it first to be safe
      if (globalHomeProductsChannel) {
        supabase.removeChannel(globalHomeProductsChannel);
        globalHomeProductsChannel = null;
      }

      const channelName = `home-products-user-${uid}`;

      // DOUBLE CHECK: Remove any lingering channel with same name from client specific registry
      const existing = supabase.getChannels().find(ch => ch.topic === channelName);
      if (existing) {
        supabase.removeChannel(existing);
      }

      globalHomeProductsChannel = supabase
        .channel(channelName)
        // ✅ Product INSERT
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "Product" },
          (payload) => {
            setTimeout(() => {
              onProductsChange();
            }, 200);
          }
        )
        // ✅ Product UPDATE
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "Product" },
          (payload) => {
            const productId = Number(payload.new.id);
            const pending = pendingProductUpdates.has(productId);

            const oldStars = payload.old?.stars;
            const newStars = payload.new?.stars;

            const shouldReload = pending || oldStars !== newStars || (newStars !== undefined && oldStars === undefined);

            if (shouldReload) {
              if (pending) pendingProductUpdates.delete(productId);
              setTimeout(() => {
                onProductsChange();
              }, 200);
            }
          }
        )
        // ✅ Product DELETE
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "Product" },
          (payload) => {
            setTimeout(() => {
              onProductsChange();
            }, 200);
          }
        )
        // ✅ Messages INSERT
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "Messages" },
          (payload) => {
            if (payload.new.message_type === "product" && payload.new.stars != null) {

              // Add to pending updates
              const pid = Number(payload.new.product_id);
              pendingProductUpdates.add(pid);

              // Fallback: If product update doesn't come
              setTimeout(() => {
                if (pendingProductUpdates.has(pid)) {
                  pendingProductUpdates.delete(pid);
                  if (onProductCommentAdded) onProductCommentAdded(pid);
                  else onProductsChange();
                }
              }, 2000);
            }
          }
        )
        .subscribe((status, err) => {

          if (status === "SUBSCRIBED") {
          } else if (status === "TIMED_OUT" || status === "CHANNEL_ERROR") {
            console.error(`❌ HOME REALTIME: Channel failed (${status}). Retrying in 5s...`);
            if (globalHomeProductsChannel) {
              supabase.removeChannel(globalHomeProductsChannel);
              globalHomeProductsChannel = null;
            }
            retryTimeout = setTimeout(setupChannel, 5000);
          }
        });
    };

    const cleanupChannel = () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      if (globalHomeProductsChannel) {
        supabase.removeChannel(globalHomeProductsChannel);
        globalHomeProductsChannel = null;
      }
    };

    // ✅ BFCache Support
    const onPageHide = () => {
      cleanupChannel();
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Restore connection if page is restored from cache
        setupChannel();
      }
    };

    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);

    setupChannel();

    onCleanup(() => {
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      cleanupChannel();
      pendingProductUpdates.clear();
    });
  });
}
