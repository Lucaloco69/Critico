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

export function Home() {
  const navigate = useNavigate();

  const { userId, trustlevel } = useCurrentUser();
  const { products, loading, loadProducts } = useProducts(trustlevel);
  const { tags } = useTags();

  const { selectedTags, setSelectedTags, searchQuery, setSearchQuery, filteredProducts } =
    useProductFilters(products);

  useRealtimeProducts(userId, loadProducts);
  useRealtimeMessages(userId);

  const handleCreateProduct = () => {
    if (!isLoggedIn()) navigate("/login");
    else navigate("/createProduct");
  };

  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-gray-900 dark:via-slate-900 dark:to-gray-950">
      {/* Header FULL width */}
      <HomeHeader
        tags={tags}
        selectedTags={selectedTags}
        setSelectedTags={setSelectedTags}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onCreateProduct={handleCreateProduct}
      />

      {/* Page content constrained */}
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="pb-10 sm:pb-12 lg:pb-16">
          <ProductGrid products={filteredProducts} loading={loading} />
        </div>
      </div>
    </div>
  );
}
