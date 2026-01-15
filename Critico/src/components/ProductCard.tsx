import { A } from "@solidjs/router";
import { Show, For } from "solid-js";
import StarRating from "./StarRating";

interface Product {
  id: number;
  name: string;
  beschreibung: string;
  picture: string | null;
  owner_id: number;
  stars: number;
  price: number | null; // ✅ NEU
  tags?: { id: number; name: string }[];
}

interface ProductCardProps {
  product: Product;
}

export function ProductCard(props: ProductCardProps) {
  return (
    <A
      href={`/product/${props.product.id}`}
      class="group bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-2xl transition-all overflow-hidden hover:-translate-y-1 duration-300"
    >
      <div class="relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 p-3">
        <div class="aspect-square bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-sm">
          <Show
            when={props.product.picture}
            fallback={
              <div class="w-full h-full flex items-center justify-center text-gray-400">
                <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            }
          >
            <img
              src={props.product.picture!}
              alt={props.product.name}
              loading="lazy"
              decoding="async"
              class="w-full h-full object-contain p-3 group-hover:scale-110 transition-transform duration-500 ease-out"
              style="filter: brightness(1.05) contrast(1.08) saturate(1.05);"
            />
          </Show>
        </div>
        <div class="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-lg"></div>
      </div>

      <div class="p-4 space-y-2.5">
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-semibold text-gray-900 dark:text-white truncate text-base">
            {props.product.name}
          </h3>

          <Show when={props.product.price !== null}>
            <span class="text-sm font-semibold text-sky-600 dark:text-sky-400 tabular-nums whitespace-nowrap">
              {Number(props.product.price).toFixed(2)} €
            </span>
          </Show>
        </div>

        <Show
          when={props.product.stars > 0}
          fallback={
            <div class="flex items-center gap-2 h-5">
              <span class="text-xs text-gray-400 dark:text-gray-500 italic">Noch keine Bewertung</span>
            </div>
          }
        >
          <div class="flex items-center gap-2.5">
            <StarRating rating={props.product.stars} maxStars={5} />
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300 tabular-nums">
              {props.product.stars.toFixed(1)}
            </span>
          </div>
        </Show>

        <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed min-h-[2.5rem]">
          {props.product.beschreibung}
        </p>

        <Show when={props.product.tags && props.product.tags.length > 0}>
          <div class="flex flex-wrap gap-1.5 pt-1">
            <For each={props.product.tags?.slice(0, 2)}>
              {(tag) => (
                <span class="px-2.5 py-1 bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 text-xs rounded-full font-medium">
                  {tag.name}
                </span>
              )}
            </For>
            <Show when={props.product.tags!.length > 2}>
              <span class="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full font-medium">
                +{props.product.tags!.length - 2}
              </span>
            </Show>
          </div>
        </Show>
      </div>
    </A>
  );
}
