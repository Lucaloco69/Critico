import { Show, For, Accessor } from "solid-js";
import { A } from "@solidjs/router";
import { ProductCard } from "../share/ProductCard";
import type { ProductCard as ProductCardType } from "../../hooks/profile/useUserProduct";
import { t } from "../../lib/i18n";

interface ProductGridProps {
  products: Accessor<ProductCardType[]>;
  loading: Accessor<boolean>;
  hasMore?: Accessor<boolean>;
  onLoadMore?: () => void;
}

export default function ProductGrid(props: ProductGridProps) {
  return (
    <div class="rounded-2xl bg-white dark:bg-gray-800 shadow-md p-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">{t("profileProductGrid.title")}</h2>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{t("profileProductGrid.subtitle")}</p>
        </div>

        <div class="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("profileProductGrid.totalCount", { count: props.products().length })}
          </span>
        </div>
      </div>

      <Show
        when={!props.loading()}
        fallback={
          <div class="flex justify-center items-center py-16">
            <div class="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <Show
          when={props.products().length > 0}
          fallback={
            <div class="py-12 text-center">
              <svg class="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p class="text-gray-400 font-medium">{t("profileProductGrid.emptyTitle")}</p>
              <p class="text-sm text-gray-500 mt-1">{t("profileProductGrid.emptySubtitle")}</p>
            </div>
          }
        >
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <For each={props.products()}>
              {(p, i) => <ProductCard product={p} priority={i() < 4} />}
            </For>
          </div>

          <Show when={props.hasMore?.() && props.onLoadMore}>
            <div class="flex justify-center mt-8">
              <button
                type="button"
                onClick={props.onLoadMore}
                class="px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-xl transition-colors shadow-lg hover:shadow-xl"
              >
                {t("profileProductGrid.loadMore")}
              </button>
            </div>
          </Show>
        </Show>
      </Show>
    </div>
  );
}
