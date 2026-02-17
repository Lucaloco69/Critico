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
      if (globalHomeProductsChannel) {
        supabase.removeChannel(globalHomeProductsChannel);
        globalHomeProductsChannel = null;
      }

      const channelName = `home-products-user-${uid}`;

      const existing = supabase.getChannels().find(ch => ch.topic === channelName);
      if (existing) {
        supabase.removeChannel(existing);
      }

      globalHomeProductsChannel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "Product" },
          (payload) => {
            setTimeout(() => {
              onProductsChange();
            }, 200);
          }
        )
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
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "Product" },
          (payload) => {
            setTimeout(() => {
              onProductsChange();
            }, 200);
          }
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "Messages" },
          (payload) => {
            if (payload.new.message_type === "product" && payload.new.stars != null) {

              const pid = Number(payload.new.product_id);
              pendingProductUpdates.add(pid);

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

    const onPageHide = () => {
      cleanupChannel();
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
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
