import { Show, For, Accessor } from "solid-js";
import { A } from "@solidjs/router";
import { ProductCard } from "../../components/ProductCard";
import type { ProductCard as ProductCardType } from "../../hooks/profile/useUserProduct";
import { t } from "../../lib/i18n";

interface ProductGridProps {
  products: Accessor<ProductCardType[]>;
  loading: Accessor<boolean>;
}

export default function ProductGrid(props: ProductGridProps) {
  return (
    <div class="rounded-2xl bg-white dark:bg-gray-800 shadow-md p-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-bold text-white">{t("profileProductGrid.title")}</h2>
          <p class="text-sm text-gray-400 mt-0.5">{t("profileProductGrid.subtitle")}</p>
        </div>

        <div class="px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
          <span class="text-sm font-medium text-gray-300">
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
        </Show>
      </Show>
    </div>
  );
}
