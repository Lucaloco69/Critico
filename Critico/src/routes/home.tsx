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
import { locale } from "../lib/i18n";

export function Home() {
  const navigate = useNavigate();

  const { userId, trustlevel } = useCurrentUser();
  const { products, loading, loadProducts, refreshProductRating, loadMore, hasMore } = useProducts(trustlevel);
  const { tags } = useTags();

  // ✅ FIX: products ist Store, wrap als Accessor!
  const { selectedTags, setSelectedTags, searchQuery, setSearchQuery, filteredProducts } =
    useProductFilters(() => products);

  useRealtimeProducts(userId, loadProducts, refreshProductRating);
  useRealtimeMessages(userId);

  const handleCreateProduct = () => {
    if (!isLoggedIn()) navigate("/login");
    else navigate("/createProduct");
  };

  return (
    <div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gradient-to-br dark:from-gray-900 dark:via-slate-900 dark:to-gray-950">
      <HomeHeader
        tags={tags}
        selectedTags={selectedTags}
        setSelectedTags={setSelectedTags}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onCreateProduct={handleCreateProduct}
      />

      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex-grow w-full">
        <div class="pb-5 sm:pb-5 lg:pb-5">
          <ProductGrid
            products={filteredProducts}
            loading={loading}
            loadMore={loadMore}
            hasMore={hasMore}
          />
        </div>
      </div>

      <footer class="mt-auto py-8 border-t border-gray-200 dark:border-gray-800">
        <div class="max-w-7xl mx-auto px-4 flex justify-center">
          <a href={locale() === "en" ? "/impressum-en" : "/impressum"} target="_self" class="text-sm text-gray-500 hover:text-sky-500 transition-colors">
            Impressum
          </a>
        </div>
      </footer>
    </div>
  );
}
