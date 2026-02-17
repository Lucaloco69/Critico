import { createSignal, createEffect, Accessor, batch } from "solid-js";
import { createStore } from "solid-js/store";
import { supabase } from "../../lib/supabaseClient";

export interface Product {
  id: number;
  name: string;
  description: string;
  picture: string | null;
  owner_id: number;
  stars: number | null;
  price: number | null;
  tags?: { id: number; name: string }[];
}

const maxPriceForTrustlevel = (tl: number) => {
  switch (tl) {
    case 0:
      return 2;
    case 1:
      return 5;
    case 2:
      return 25;
    case 3:
      return 50;
    case 4:
      return 200;
    default:
      return 999999;
  }
};

export function useProducts(trustlevel: Accessor<number>) {
  const [products, setProducts] = createStore<Product[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [hasMore, setHasMore] = createSignal(true);
  const [page, setPage] = createSignal(0);
  const LIMIT = 10;

  const loadProducts = async (reset = false) => {
    try {
      setLoading(true);

      const currentPage = reset ? 0 : page();
      const from = currentPage * LIMIT;
      const to = from + LIMIT - 1;

      const maxPrice = maxPriceForTrustlevel(trustlevel());

      const { data: productsData, error: productsError } = await supabase
        .from("Product")
        .select(`
          id,
          name,
          description:beschreibung,
          price,
          owner_id,
          stars,
          Product_Tags (
            Tags (
              id,
              name
            )
          ),
          product_images (
            id,
            image_url,
            order_index
          )
        `)
        .lte("price", maxPrice)
        .order("id", { ascending: false })
        .range(from, to);

      if (productsError) throw productsError;

      if (productsData && productsData.length < LIMIT) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      const transformedProducts = (productsData || []).map((p: any) => {
        const allImages: string[] = [];

        if (p.product_images && p.product_images.length > 0) {
          const images = p.product_images
            .sort((a: any, b: any) => a.order_index - b.order_index)
            .map((img: any) => img.image_url);
          allImages.push(...images);
        }

        const transformed = {
          id: p.id,
          name: p.name,
          description: p.description || p.beschreibung,
          price: p.price ?? null,
          picture: allImages[0] || null,
          owner_id: p.owner_id,
          stars: p.stars !== null && p.stars !== undefined ? Number(p.stars) : null,
          tags: p.Product_Tags?.map((pt: any) => pt.Tags).filter(Boolean) || [],
        };

        return transformed;
      });

      if (reset) {
        setProducts(transformedProducts);
        setPage(1);
      } else {
        setProducts([...products, ...transformedProducts]);
        setPage(p => p + 1);
      }

      setLoading(false);

      const productIds = transformedProducts.map((p) => p.id);

      if (productIds.length > 0) {
        const { data: ratingsData, error: ratingsError } = await supabase
          .from("Messages")
          .select("product_id, stars")
          .in("product_id", productIds)
          .eq("message_type", "product")
          .not("stars", "is", null);

        if (ratingsError) {
        } else {
          const ratingsMap = new Map<number, number[]>();
          (ratingsData || []).forEach((r: any) => {
            if (!ratingsMap.has(r.product_id)) ratingsMap.set(r.product_id, []);
            ratingsMap.get(r.product_id)?.push(r.stars);
          });

          batch(() => {
            transformedProducts.forEach((p) => {
              const productRatings = ratingsMap.get(p.id);
              if (productRatings && productRatings.length > 0) {
                const total = productRatings.reduce((sum, r) => sum + r, 0);
                const avg = total / productRatings.length;
                const rounded = Math.round(avg * 10) / 10;

                setProducts(
                  (storedProduct) => storedProduct.id === p.id,
                  "stars",
                  rounded
                );
              }
            });
          });
        }
      }

    } catch (err) {
      setLoading(false);
    }
  };

  createEffect(() => {
    trustlevel();
    loadProducts(true);
  });

  const loadMore = () => {
    if (!loading() && hasMore()) {
      loadProducts(false);
    }
  };

  const refreshProductRating = async (productId: number) => {
    try {

      const { data: messages } = await supabase
        .from("Messages")
        .select("stars")
        .eq("product_id", productId)
        .eq("message_type", "product")
        .not("stars", "is", null);

      if (messages && messages.length > 0) {
        const total = messages.reduce((sum, m) => sum + (m.stars || 0), 0);
        const avg = total / messages.length;
        const rounded = Math.round(avg * 10) / 10;


        setProducts(
          (p) => p.id === productId,
          "stars",
          rounded
        );

        supabase.from("Product").update({ stars: rounded }).eq("id", productId).then(({ error }) => {

        });

      }
    } catch (err) {
    }
  };

  return {
    products,
    loading,
    loadProducts: () => loadProducts(true),
    loadMore,
    hasMore,
    refreshProductRating,
  };
}
