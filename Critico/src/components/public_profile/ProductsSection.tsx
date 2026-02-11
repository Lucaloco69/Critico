import { For, Show } from "solid-js";
import type { ProductCard } from "../../routes/PublicProfile";
import ProductCardItem from "./ProductCard";
import { t } from "../../lib/i18n";

export default function ProductsSection(props: { products: ProductCard[]; productsLoading: boolean }) {
  return (
    <section class="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-7 shadow-lg">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-white">{t("publicProfileProductsSection.title")}</h2>
          <p class="text-sm text-white/70">{t("publicProfileProductsSection.subtitle")}</p>
        </div>

        <span class="shrink-0 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-sm text-white/80">
          {t("publicProfileProductsSection.totalCount", { count: props.products.length })}
        </span>
      </div>

      <Show
        when={!props.productsLoading}
        fallback={
          <div class="flex justify-center items-center py-12">
            <div class="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <Show
          when={props.products.length > 0}
          fallback={
            <div class="mt-6 rounded-2xl border border-white/10 bg-black/10 p-6">
              <p class="text-sm text-white/75">{t("publicProfileProductsSection.empty")}</p>
            </div>
          }
        >
          <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <For each={props.products}>{(p) => <ProductCardItem product={p} />}</For>
          </div>
        </Show>
      </Show>
    </section>
  );
}
