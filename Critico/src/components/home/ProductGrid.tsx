import { Show, For, Accessor } from "solid-js";
import { ProductCard } from "../share/ProductCard";
import { Product } from "../../hooks/home/useProducts";
import { t } from "../../lib/i18n";
import { ProductCardSkeleton } from "../share/ProductCardSkeleton";

interface ProductGridProps {
  products: Accessor<Product[]>;
  loading: Accessor<boolean>;
  loadMore?: () => void;
  hasMore?: Accessor<boolean>;
}

export default function ProductGrid(props: ProductGridProps) {
  const hasProducts = () => props.products().length > 0;

  return (
    <main class="pt-6 sm:pt-8 pb-6 sm:pb-8 lg:pb-10 min-h-[60vh] sm:min-h-[70vh]">
      <Show when={props.loading()}>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 animate-in fade-in duration-500">
          <For each={Array(10).fill(0)}>
            {() => <ProductCardSkeleton />}
          </For>
        </div>
      </Show>

      <Show when={!props.loading() && !hasProducts()}>
        <div class="text-center py-16 sm:py-20">
          <p class="text-gray-500 dark:text-gray-400 text-base sm:text-lg">
            {t("productGrid.empty")}
          </p>
        </div>
      </Show>

      <Show when={hasProducts()}>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
          <For each={props.products()}>{(product, i) => <ProductCard product={product} priority={i() < 6} />}</For>
        </div>
      </Show>

      {/* Load More Button */}
      <Show when={props.hasMore && props.hasMore() && !props.loading()}>
        <div class="flex justify-center pt-6 pb-2">
          <button
            onClick={() => props.loadMore?.()}
            class="px-6 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-full shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95"
          >
            {t("productGrid.loadMore") || "Load More"}
          </button>
        </div>
      </Show>
    </main >
  );
}
