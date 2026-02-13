import { createSignal, createEffect, Accessor } from "solid-js";
import { createStore } from "solid-js/store";
import { supabase } from "../../lib/supabaseClient";

export interface Product {
  id: number;
  name: string;
  beschreibung: string;
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

      // ✅ DEBUG: Was kommt von Supabase?
      console.log("🔍 RAW productsData:", productsData?.slice(0, 2));

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
          beschreibung: p.beschreibung,
          price: p.price ?? null,
          picture: allImages[0] || null,
          owner_id: p.owner_id,
          stars: p.stars !== null && p.stars !== undefined ? Number(p.stars) : null,
          tags: p.Product_Tags?.map((pt: any) => pt.Tags).filter(Boolean) || [],
        };

        // ✅ DEBUG: Log transformation
        console.log(`🔧 Product ${p.id}:`, {
          name: p.name,
          starsRaw: p.stars,
          starsTransformed: transformed.stars,
        });

        return transformed;
      });

      console.log("✅ HOME: Products loaded:", transformedProducts.length);
      console.log("📊 HOME: First 3 products with stars:", 
        transformedProducts.slice(0, 3).map(p => ({ 
          id: p.id, 
          name: p.name, 
          stars: p.stars 
        }))
      );

      setProducts(transformedProducts);
      
    } catch (err) {
      console.error("❌ HOME: Fehler beim Laden der Produkte:", err);
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    trustlevel();
    loadProducts();
  });

  return {
    products, // ✅ DIREKT den Store returnen!
    loading,
    loadProducts,
  };
}
