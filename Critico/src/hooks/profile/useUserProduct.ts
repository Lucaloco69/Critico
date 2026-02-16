import { createSignal, createEffect, onCleanup, Accessor } from "solid-js";
import { supabase } from "../../lib/supabaseClient";
import { roundStars } from "../../lib/publicProfileUtils";

interface ProductListRow {
  id: number;
  name: string;
  description: string | null;
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
  description: string;
  price: number | null;
  stars: number;
  picture: string | null;
  owner_id: number;
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
            description:beschreibung,
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

        // Initialize mapped products
        const mapped: ProductCard[] = (data ?? []).map((p: ProductListRow) => {
          const firstImg =
            p.product_images && p.product_images.length > 0
              ? p.product_images
                .slice()
                .sort((a, b) => a.order_index - b.order_index)[0]?.image_url ?? null
              : null;

          return {
            id: p.id,
            name: p.name,
            description: p.description ?? "",
            price: p.price,
            stars: 0, // Temp default
            picture: firstImg,
            owner_id: p.owner_id,
          };
        });

        // ✅ FETCH RATINGS FROM MESSAGES (Client-side calc)
        const productIds = mapped.map((p) => p.id);
        if (productIds.length > 0) {
          const { data: ratingsData } = await supabase
            .from("Messages")
            .select("product_id, stars")
            .in("product_id", productIds)
            .eq("message_type", "product")
            .not("stars", "is", null);

          const ratingsMap = new Map<number, number[]>();
          (ratingsData || []).forEach((r: any) => {
            if (!ratingsMap.has(r.product_id)) ratingsMap.set(r.product_id, []);
            ratingsMap.get(r.product_id)?.push(r.stars);
          });

          mapped.forEach((p) => {
            const productRatings = ratingsMap.get(p.id);
            if (productRatings && productRatings.length > 0) {
              const total = productRatings.reduce((sum, r) => sum + r, 0);
              const avg = total / productRatings.length;
              p.stars = roundStars(avg);
            } else {
              // Fallback to DB stars if no messages found
              const original = data?.find(d => d.id === p.id)?.stars;
              p.stars = roundStars(original);
            }
          });
        }

        setProducts(mapped);
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

          const updated = payload.new;
          if (!updated || !updated.id) return;

          setProducts((prev) => {
            return prev.map((p) => {
              if (p.id === updated.id) {
                const roundedStars = roundStars(updated.stars);

                return { ...p, stars: roundedStars };
              }
              return p;
            });
          });
        }
      )
      .subscribe();

    onCleanup(() => {
      supabase.removeChannel(channel);
    });
  });

  return {
    products,
    loading,
  };
}
