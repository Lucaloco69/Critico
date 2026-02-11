import { Show, For, Accessor } from "solid-js";
import { ProductCard } from "../ProductCard";
import { Product } from "../../hooks/home/useProducts";
import { t } from "../../lib/i18n";

interface ProductGridProps {
  products: Accessor<Product[]>;
  loading: Accessor<boolean>;
}

export default function ProductGrid(props: ProductGridProps) {
  const hasProducts = () => props.products().length > 0;

  return (
    <main class="pt-6 sm:pt-8 pb-10 sm:pb-12 lg:pb-16 min-h-[40vh]">
      <Show when={props.loading()}>
        <div class="flex justify-center items-center py-16 sm:py-20">
          <div class="w-10 h-10 sm:w-12 sm:h-12 border-4 border-sky-500 border-t-transparent rounded-full motion-safe:animate-spin motion-reduce:animate-none" />
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
          <For each={props.products()}>{(product) => <ProductCard product={product} />}</For>
        </div>
      </Show>
    </main>
  );
}
