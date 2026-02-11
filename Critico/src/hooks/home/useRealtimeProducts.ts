import { onMount, onCleanup, Accessor } from "solid-js";
import { supabase } from "../../lib/supabaseClient";

let globalHomeProductsChannel: any = null;
let pendingProductUpdates = new Set<number>();

export function useRealtimeProducts(
  userId: Accessor<number | null>,
  onProductsChange: () => void
) {
  onMount(() => {
    const checkUserAndSetup = setInterval(() => {
      const uid = userId();
      if (uid) {
        clearInterval(checkUserAndSetup);

        console.log("🚀 HOME REALTIME: Setup für Products, User:", uid);

        if (!globalHomeProductsChannel) {
          console.log("🔌 HOME REALTIME: Creating Products Channel");
          
          const channelName = `home-products-user-${uid}`;
          
          const existingChannel = supabase.getChannels().find(ch => ch.topic === channelName);
          if (existingChannel) {
            console.log("🗑️ HOME REALTIME: Removing existing Products channel");
            supabase.removeChannel(existingChannel);
          }

          globalHomeProductsChannel = supabase
            .channel(channelName)
            // ✅ Product INSERT
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "Product",
              },
              (payload) => {
                console.log("🔔 HOME REALTIME: Neues Produkt empfangen!");
                console.log("🆕 Product ID:", payload.new.id);
                console.log("📝 Product Name:", payload.new.name);
                
                setTimeout(() => {
                  console.log("🔄 HOME REALTIME: Reloading products (new product)...");
                  onProductsChange();
                }, 200);
              }
            )
            // ✅ Product UPDATE
            .on(
              "postgres_changes",
              {
                event: "UPDATE",
                schema: "public",
                table: "Product",
              },
              (payload) => {
                console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                console.log("🔔 HOME REALTIME: Produkt UPDATE empfangen!");
                console.log("🆔 Product ID:", payload.new.id);
                console.log("📝 Product Name:", payload.new.name);
                console.log("⭐ OLD Stars:", payload.old?.stars);
                console.log("⭐ NEW Stars:", payload.new?.stars);
                console.log("🔄 Stars changed:", payload.old?.stars !== payload.new?.stars);
                
                // ✅ Prüfe ob es ein pending update ist (von Message)
                if (pendingProductUpdates.has(payload.new.id)) {
                  console.log("✅ HOME REALTIME: Das ist das erwartete Update nach Bewertung!");
                  pendingProductUpdates.delete(payload.new.id);
                  
                  setTimeout(() => {
                    console.log("🔄 HOME REALTIME: Reloading products (rating confirmed)...");
                    onProductsChange();
                  }, 200);
                } else if (payload.old?.stars !== payload.new?.stars) {
                  // ✅ Andere Star-Updates (direkt vom System)
                  console.log("✅ HOME REALTIME: Sterne wurden geändert (direktes Update)");
                  setTimeout(() => {
                    console.log("🔄 HOME REALTIME: Reloading products (stars update)...");
                    onProductsChange();
                  }, 200);
                } else {
                  console.log("ℹ️ HOME REALTIME: Update ignoriert (keine Star-Änderung)");
                }
                console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
              }
            )
            // ✅ Product DELETE
            .on(
              "postgres_changes",
              {
                event: "DELETE",
                schema: "public",
                table: "Product",
              },
              (payload) => {
                console.log("🔔 HOME REALTIME: Produkt gelöscht!");
                console.log("🗑️ Product ID:", payload.old.id);
                
                setTimeout(() => {
                  console.log("🔄 HOME REALTIME: Reloading products (delete)...");
                  onProductsChange();
                }, 200);
              }
            )
            // ✅ Messages INSERT (markiert Product für Update)
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "Messages",
              },
              (payload) => {
                // Nur bei product comments mit stars
                if (payload.new.message_type === "product" && payload.new.stars != null) {
                  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                  console.log("🔔 HOME REALTIME: Neue Bewertung (Comment)!");
                  console.log("📦 Product ID:", payload.new.product_id);
                  console.log("⭐ Stars:", payload.new.stars);
                  console.log("⏳ HOME REALTIME: Warte auf Product UPDATE Event...");
                  
                  // ✅ Merke die Product ID - wir erwarten ein UPDATE
                  pendingProductUpdates.add(payload.new.product_id);
                  
                  // ✅ Fallback: Falls Product UPDATE nicht kommt (nach 2 Sekunden)
                  setTimeout(() => {
                    if (pendingProductUpdates.has(payload.new.product_id)) {
                      console.log("⚠️ HOME REALTIME: Product UPDATE kam nicht, reload jetzt (Fallback)");
                      pendingProductUpdates.delete(payload.new.product_id);
                      onProductsChange();
                    }
                  }, 2000);
                  
                  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                }
              }
            )
            .subscribe((status, err) => {
              console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
              console.log("📡 HOME REALTIME: Products Channel Status:", status);
              if (err) {
                console.error("❌ HOME REALTIME: Channel Error:", err);
              }
              
              if (status === "SUBSCRIBED") {
                console.log("✅ HOME REALTIME: Products Channel erfolgreich verbunden!");
                console.log("🎧 Listening for:");
                console.log("  - Product: INSERT, UPDATE, DELETE");
                console.log("  - Messages: INSERT (product comments with stars)");
              } else if (status === "TIMED_OUT") {
                console.error("⏱️ HOME REALTIME: Products Channel TIMED OUT!");
              } else if (status === "CHANNEL_ERROR") {
                console.error("❌ HOME REALTIME: Products Channel ERROR!");
              }
              console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            });
        } else {
          console.log("⚠️ HOME REALTIME: Products Channel already exists");
        }
      } else {
        console.log("⏳ HOME REALTIME: Waiting for userId...");
      }
    }, 100);

    setTimeout(() => {
      clearInterval(checkUserAndSetup);
      console.log("⏱️ HOME REALTIME: Setup timeout reached");
    }, 10000);
  });

  onCleanup(() => {
    console.log("🧹 HOME REALTIME: Cleanup Products Channel");
    if (globalHomeProductsChannel) {
      supabase.removeChannel(globalHomeProductsChannel);
      globalHomeProductsChannel = null;
      pendingProductUpdates.clear();
      console.log("✅ HOME REALTIME: Products Channel removed");
    }
  });
}
