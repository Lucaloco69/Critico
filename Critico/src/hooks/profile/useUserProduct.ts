import { createSignal, createEffect, onCleanup, Accessor } from "solid-js";
import { supabase } from "../../lib/supabaseClient";

interface ProductListRow {
  id: number;
  name: string;
  beschreibung: string | null;
  price: number | null;
  owner_id: number;
  stars: number | null;
  product_images?: {
    id: number;
    image_url: string;
    order_index: number;
  }[];
}

export type ProductCard = {
  id: number;
  name: string;
  price: number | null;
  stars: number;
  picture: string | null;
};

export function useUserProducts(userId: Accessor<number | undefined>) {
  const [products, setProducts] = createSignal<ProductCard[]>([]);
  const [loading, setLoading] = createSignal(false);

  // ✅ Initial Load
  createEffect(() => {
    const uid = userId();
    if (!uid) return;

    const loadProducts = async () => {
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("Product")
          .select(
            `
            id,
            name,
            beschreibung,
            price,
            owner_id,
            stars,
            product_images (
              id,
              image_url,
              order_index
            )
          `
          )
          .eq("owner_id", uid)
          .order("id", { ascending: false });

        if (error) throw error;

        const mapped: ProductCard[] = (data ?? []).map((p: ProductListRow) => {
          const firstImg =
            p.product_images && p.product_images.length > 0
              ? p.product_images
                  .slice()
                  .sort((a, b) => a.order_index - b.order_index)[0]?.image_url ?? null
              : null;

          const roundedStars = Math.round((p.stars ?? 0) * 2) / 2;

          return {
            id: p.id,
            name: p.name,
            price: p.price,
            stars: roundedStars,
            picture: firstImg,
          };
        });

        setProducts(mapped);
        console.log("✅ USER PRODUCTS: Loaded", mapped.length, "products");
      } catch (err) {
        console.error("Fehler beim Laden der Produkte:", err);
      } finally {
        setLoading(false);
      }
    };

    void loadProducts();
  });

  // ✅ REALTIME: Sterne Updates
  createEffect(() => {
    const uid = userId();
    if (!uid) return;

    console.log("🔄 USER PRODUCTS: Setting up realtime for user", uid);

    const channel = supabase
      .channel("user-products-" + uid)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "Product",
          filter: `owner_id=eq.${uid}`,
        },
        (payload: any) => {
          console.log("🔔 USER PRODUCTS: Product updated", payload.new);

          const updated = payload.new;
          if (!updated || !updated.id) return;

          setProducts((prev) => {
            return prev.map((p) => {
              if (p.id === updated.id) {
                const roundedStars = Math.round((updated.stars ?? 0) * 2) / 2;
                console.log(
                  "🌟 USER PRODUCTS: Updating stars for product",
                  p.id,
                  "from",
                  p.stars,
                  "to",
                  roundedStars
                );
                return { ...p, stars: roundedStars };
              }
              return p;
            });
          });
        }
      )
      .subscribe();

    onCleanup(() => {
      console.log("🧹 USER PRODUCTS: Cleaning up realtime for user", uid);
      supabase.removeChannel(channel);
    });
  });

  return {
    products,
    loading,
  };
}
