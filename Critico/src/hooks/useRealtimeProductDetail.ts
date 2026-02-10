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

        console.log("🚀 PRODUCT DETAIL: Setup Realtime für Product:", pid);

        if (!globalProductDetailChannel) {
          console.log("🔌 PRODUCT DETAIL: Creating Channel");
          
          const channelName = `product-detail-${pid}`;
          
          const existingChannel = supabase.getChannels().find(ch => ch.topic === channelName);
          if (existingChannel) {
            console.log("🗑️ PRODUCT DETAIL: Removing existing channel");
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
                console.log("🔔 PRODUCT DETAIL: Product UPDATE", {
                  oldStars: payload.old.stars,
                  newStars: payload.new.stars
                });
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
                console.log("🔔 PRODUCT DETAIL: ProductComment Event");
                setTimeout(() => onProductChange(), 300);
              }
            )
            .subscribe((status, err) => {
              console.log("📡 PRODUCT DETAIL Channel Status:", status);
              if (err) console.error("❌ PRODUCT DETAIL Channel Error:", err);
              
              if (status === "SUBSCRIBED") {
                console.log("✅ PRODUCT DETAIL: Channel erfolgreich verbunden!");
              }
            });
        }
      }
    }, 100);

    setTimeout(() => clearInterval(checkAndSetup), 10000);
  });

  onCleanup(() => {
    console.log("🧹 PRODUCT DETAIL: Cleanup Channel");
    if (globalProductDetailChannel) {
      supabase.removeChannel(globalProductDetailChannel);
      globalProductDetailChannel = null;
    }
  });
}
