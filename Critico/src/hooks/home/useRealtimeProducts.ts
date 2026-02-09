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
                console.log("🔔 HOME: Neues Produkt", payload.new.id);
                setTimeout(() => {
                  console.log("🔄 HOME: Triggering products reload (new product)...");
                  onProductsChange();
                }, 200);
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
                  name: payload.new.name,
                  oldStars: payload.old?.stars,
                  newStars: payload.new?.stars
                });
                // ✅ Reload bei Rating-Änderungen
                setTimeout(() => {
                  console.log("🔄 HOME: Triggering products reload (stars update)...");
                  onProductsChange();
                }, 200);
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
                console.log("🔔 HOME: Produkt gelöscht", payload.old.id);
                setTimeout(() => {
                  console.log("🔄 HOME: Triggering products reload (delete)...");
                  onProductsChange();
                }, 200);
              }
            )
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "Messages",
              },
              (payload) => {
                // ✅ Nur bei product-type Messages mit stars
                if (payload.new.message_type === "product" && payload.new.stars != null) {
                  console.log("🔔 HOME: Neue Bewertung (Message)", {
                    productId: payload.new.product_id,
                    stars: payload.new.stars
                  });
                  // ✅ Reload Products wenn neue Bewertung kommt
                  setTimeout(() => {
                    console.log("🔄 HOME: Triggering products reload (new rating)...");
                    onProductsChange();
                  }, 500); // Etwas länger warten damit Trigger zuerst läuft
                }
              }
            )
            .on(
              "postgres_changes",
              {
                event: "UPDATE",
                schema: "public",
                table: "Messages",
              },
              (payload) => {
                // ✅ Falls Bewertungen editiert werden können
                if (payload.new.message_type === "product" && 
                    payload.old.stars !== payload.new.stars) {
                  console.log("🔔 HOME: Bewertung geändert", {
                    productId: payload.new.product_id,
                    oldStars: payload.old.stars,
                    newStars: payload.new.stars
                  });
                  setTimeout(() => {
                    console.log("🔄 HOME: Triggering products reload (rating update)...");
                    onProductsChange();
                  }, 500);
                }
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
