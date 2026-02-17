import { onMount, onCleanup, Accessor } from "solid-js";
import { supabase } from "../lib/supabaseClient";

let globalProductDetailChannel: any = null;

export function useRealtimeProductDetail(
  productId: Accessor<number | null>,
  onProductChange: () => void
) {
  onMount(() => {
    const checkAndSetup = setInterval(() => {
      const pid = productId();

      if (pid) {
        clearInterval(checkAndSetup);

        if (!globalProductDetailChannel) {

          const channelName = `product-detail-${pid}`;

          const existingChannel = supabase.getChannels().find(ch => ch.topic === channelName);
          if (existingChannel) {
            supabase.removeChannel(existingChannel);
          }

          globalProductDetailChannel = supabase
            .channel(channelName)
            .on(
              "postgres_changes",
              {
                event: "UPDATE",
                schema: "public",
                table: "Product",
                filter: `id=eq.${pid}`,
              },
              (payload) => {
                setTimeout(() => onProductChange(), 200);
              }
            )
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "ProductComments",
                filter: `product_id=eq.${pid}`,
              },
              (payload) => {
                setTimeout(() => onProductChange(), 300);
              }
            )
            .subscribe((status, err) => {
              if (err) console.error("❌ PRODUCT DETAIL Channel Error:", err);

              if (status === "SUBSCRIBED") {
              }
            });
        }
      }
    }, 100);

    setTimeout(() => clearInterval(checkAndSetup), 10000);
  });

  onCleanup(() => {
    if (globalProductDetailChannel) {
      supabase.removeChannel(globalProductDetailChannel);
      globalProductDetailChannel = null;
    }
  });
}
