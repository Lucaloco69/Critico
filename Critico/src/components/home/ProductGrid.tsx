import { Show, For, Accessor } from "solid-js";
import { ProductCard } from "../ProductCard";
import { Product } from "../../hooks/home/useProducts";

interface ProductGridProps {
  products: Accessor<Product[]>;
  loading: Accessor<boolean>;
}

export default function ProductGrid(props: ProductGridProps) {
  return (
    <main class="max-w-7xl mx-auto px-4 py-8">
      <Show when={props.loading()}>
        <div class="flex justify-center items-center py-20">
          <div class="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Show>

      <Show when={!props.loading() && props.products().length === 0}>
        <div class="text-center py-20">
          <p class="text-gray-500 dark:text-gray-400 text-lg">Keine Produkte gefunden.</p>
        </div>
      </Show>

      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        <For each={props.products()}>{(product) => <ProductCard product={product} />}</For>
      </div>
    </main>
  );
}
