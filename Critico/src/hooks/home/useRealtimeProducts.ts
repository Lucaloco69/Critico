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
        console.log("🧹 HOME REALTIME: Cleanup matched channel before setup");
        supabase.removeChannel(globalHomeProductsChannel);
        globalHomeProductsChannel = null;
      }

      console.log("🚀 HOME REALTIME: Setup for Products, User:", uid);
      const channelName = `home-products-user-${uid}`;

      // DOUBLE CHECK: Remove any lingering channel with same name from client specific registry
      const existing = supabase.getChannels().find(ch => ch.topic === channelName);
      if (existing) {
        console.log("🗑️ HOME REALTIME: Removing lingering channel found in client");
        supabase.removeChannel(existing);
      }

      globalHomeProductsChannel = supabase
        .channel(channelName)
        // ✅ Product INSERT
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "Product" },
          (payload) => {
            console.log("🔔 HOME REALTIME: New product:", payload.new.name);
            setTimeout(() => {
              console.log("🔄 HOME REALTIME: Reloading products (new product)...");
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
              console.log(`✅ HOME REALTIME: Reload for product ${productId}`, { pending, oldStars, newStars });
              if (pending) pendingProductUpdates.delete(productId);
              setTimeout(() => {
                console.log("🔄 HOME REALTIME: Reloading products...");
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
            console.log("🔔 HOME REALTIME: Product deleted:", payload.old.id);
            setTimeout(() => {
              console.log("🔄 HOME REALTIME: Reloading products (delete)...");
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
              console.log("🔔 HOME REALTIME: New rating (Comment) for product:", payload.new.product_id);

              // Add to pending updates
              const pid = Number(payload.new.product_id);
              pendingProductUpdates.add(pid);

              // Fallback: If product update doesn't come
              setTimeout(() => {
                if (pendingProductUpdates.has(pid)) {
                  console.log("⚠️ HOME REALTIME: Product UPDATE missing, fallback reload");
                  pendingProductUpdates.delete(pid);
                  if (onProductCommentAdded) onProductCommentAdded(pid);
                  else onProductsChange();
                }
              }, 2000);
            }
          }
        )
        .subscribe((status, err) => {
          console.log(`📡 HOME REALTIME: Channel Status: ${status}`);

          if (status === "SUBSCRIBED") {
            console.log("✅ HOME REALTIME: Connected!");
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

    setupChannel();

    onCleanup(() => {
      console.log("🧹 HOME REALTIME: Cleanup (effect)");
      if (retryTimeout) clearTimeout(retryTimeout);
      if (globalHomeProductsChannel) {
        supabase.removeChannel(globalHomeProductsChannel);
        globalHomeProductsChannel = null;
        pendingProductUpdates.clear();
      }
    });
  });
}
