import { createSignal, createEffect, Accessor } from "solid-js";
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
      } catch (err) {
        console.error("Fehler beim Laden der Produkte:", err);
      } finally {
        setLoading(false);
      }
    };

    void loadProducts();
  });

  return {
    products,
    loading,
  };
}
