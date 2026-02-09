import { createSignal, createEffect, Accessor } from "solid-js";
import { supabase } from "../../lib/supabaseClient";

export interface Product {
  id: number;
  name: string;
  beschreibung: string;
  picture: string | null;
  owner_id: number;
  stars: number;
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
  const [products, setProducts] = createSignal<Product[]>([]);
  const [loading, setLoading] = createSignal(true);

  const loadProducts = async () => {
    try {
      console.log("🔄 HOME: Loading products...");
      setLoading(true);

      const maxPrice = maxPriceForTrustlevel(trustlevel());

      const { data: productsData, error: productsError } = await supabase
        .from("Product")
        .select(`
          id,
          name,
          beschreibung,
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
        .order("id", { ascending: false });

      if (productsError) throw productsError;

      const transformedProducts = (productsData || []).map((p: any) => {
        const allImages: string[] = [];

        if (p.product_images && p.product_images.length > 0) {
          const images = p.product_images
            .sort((a: any, b: any) => a.order_index - b.order_index)
            .map((img: any) => img.image_url);
          allImages.push(...images);
        }

        return {
          id: p.id,
          name: p.name,
          beschreibung: p.beschreibung,
          price: p.price ?? null,
          picture: allImages[0] || null,
          owner_id: p.owner_id,
          stars: p.stars || 0,
          tags: p.Product_Tags?.map((pt: any) => pt.Tags).filter(Boolean) || [],
        };
      });

      setProducts(transformedProducts);
    } catch (err) {
      console.error("Fehler beim Laden der Produkte:", err);
    } finally {
      setLoading(false);
    }
  };

  // Reload when trustlevel changes
  createEffect(() => {
    trustlevel();
    loadProducts();
  });

  return {
    products,
    loading,
    loadProducts,
  };
}
