import { onMount, onCleanup, Accessor } from "solid-js";
import { supabase } from "../../lib/supabaseClient";

let globalHomeProductsChannel: any = null;

export function useRealtimeProducts(userId: Accessor<number | null>, onProductChange: () => void) {
  onMount(() => {
    const checkUserAndSetup = setInterval(() => {
      const uid = userId();
      if (uid) {
        clearInterval(checkUserAndSetup);

        console.log("🚀 HOME: Setup Realtime für Products");

        if (!globalHomeProductsChannel) {
          console.log("🔌 HOME: Creating Products Channel");
          globalHomeProductsChannel = supabase
            .channel("home_products_changes")
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "Product",
              },
              (payload) => {
                console.log("🔔 HOME: Product UPDATE Event!", payload);
                onProductChange();
              }
            )
            .subscribe((status) => {
              console.log("📡 HOME Products Channel Status:", status);
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
