import { onMount, onCleanup, Accessor } from "solid-js";
import { supabase } from "../../lib/supabaseClient";

let globalHomeProductsChannel: any = null;

export function useRealtimeProducts(
  userId: Accessor<number | null>,
  onProductsChange: () => void
) {
  onMount(() => {
    const checkUserAndSetup = setInterval(() => {
      const uid = userId();
      if (uid) {
        clearInterval(checkUserAndSetup);

        console.log("🚀 HOME: Setup Realtime für Products");

        if (!globalHomeProductsChannel) {
          console.log("🔌 HOME: Creating Products Channel");
          
          const channelName = `home-products-user-${uid}`;
          
          const existingChannel = supabase.getChannels().find(ch => ch.topic === channelName);
          if (existingChannel) {
            console.log("🗑️ HOME: Removing existing Products channel");
            supabase.removeChannel(existingChannel);
          }

          globalHomeProductsChannel = supabase
            .channel(channelName)
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "Product",
              },
              (payload) => {
                console.log("🔔 HOME: Neues Produkt");
                setTimeout(() => onProductsChange(), 200);
              }
            )
            .on(
              "postgres_changes",
              {
                event: "UPDATE",
                schema: "public",
                table: "Product",
              },
              (payload) => {
                console.log("🔔 HOME: Produkt UPDATE", {
                  id: payload.new.id,
                  oldStars: payload.old.stars,
                  newStars: payload.new.stars
                });
                // ✅ Reload bei Rating-Änderungen
                setTimeout(() => onProductsChange(), 200);
              }
            )
            .on(
              "postgres_changes",
              {
                event: "DELETE",
                schema: "public",
                table: "Product",
              },
              (payload) => {
                console.log("🔔 HOME: Produkt gelöscht");
                setTimeout(() => onProductsChange(), 200);
              }
            )
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "ProductComments",
              },
              (payload) => {
                console.log("🔔 HOME: ProductComment Event (neue Bewertung)");
                // ✅ Reload Products wenn neue Bewertung kommt
                setTimeout(() => onProductsChange(), 300);
              }
            )
            .subscribe((status, err) => {
              console.log("📡 HOME Products Channel Status:", status);
              if (err) console.error("❌ HOME Products Channel Error:", err);
              
              if (status === "SUBSCRIBED") {
                console.log("✅ HOME: Products Channel erfolgreich verbunden!");
              }
            });
        }
      }
    }, 100);

    setTimeout(() => clearInterval(checkUserAndSetup), 10000);
  });

  onCleanup(() => {
    console.log("🧹 HOME: Cleanup Products Channel");
    if (globalHomeProductsChannel) {
      supabase.removeChannel(globalHomeProductsChannel);
      globalHomeProductsChannel = null;
    }
  });
}
