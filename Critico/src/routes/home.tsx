import { useNavigate } from "@solidjs/router";
import { isLoggedIn } from "../lib/sessionStore";
import { useCurrentUser } from "../hooks/home/useCurrentUser";
import { useProducts } from "../hooks/home/useProducts";
import { useTags } from "../hooks/home/useTags";
import { useProductFilters } from "../hooks/home/useProductFilter";
import { useRealtimeProducts } from "../hooks/home/useRealtimeProducts";
import { useRealtimeMessages } from "../hooks/home/useRealtimeMessages";
import HomeHeader from "../components/home/HomeHeader";
import ProductGrid from "../components/home/ProductGrid";
import { createSignal } from "solid-js";

export function Home() {
  const navigate = useNavigate();

  // User laden
  const { userId, trustlevel } = useCurrentUser();

  // Produkte laden (basierend auf Trustlevel)
  const { products, loading, loadProducts } = useProducts(trustlevel);

  // Tags laden
  const { tags } = useTags();

  // Filter-Logik
  const { selectedTags, setSelectedTags, searchQuery, setSearchQuery, filteredProducts } = useProductFilters(products);

  // Realtime Updates
  useRealtimeProducts(userId, loadProducts);
  useRealtimeMessages(userId);

  const handleCreateProduct = () => {
    if (!isLoggedIn()) {
      navigate("/login");
    } else {
      navigate("/createProduct");
    }
  };

  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <HomeHeader
        tags={tags}
        selectedTags={selectedTags}
        setSelectedTags={setSelectedTags}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onCreateProduct={handleCreateProduct}
      />

      <ProductGrid products={filteredProducts} loading={loading} />
    </div>
  );
}
