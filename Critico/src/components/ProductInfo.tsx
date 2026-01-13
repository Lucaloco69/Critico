import { Show, For } from "solid-js";
import StarRating from "./StarRating";
import type { Product } from "../types/product";

interface ProductInfoProps {
  product: Product;
  commentsCount: number;
  onRequestTest: () => void;
  onContact: () => void;
}

export default function ProductInfo(props: ProductInfoProps) {
  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return "Preis auf Anfrage";
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  };

  return (
    <div class="flex flex-col h-full">
      <h1 class="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
        {props.product.name}
      </h1>

      {/* Sterne-Bewertung */}
      <div class="mb-6">
        <Show when={props.product.stars > 0 && props.commentsCount > 0} fallback={
          <div class="flex items-center gap-2">
            <StarRating rating={0} maxStars={5} size="lg" />
            <span class="text-sm text-gray-400 dark:text-gray-500 italic ml-2">
              Noch keine Bewertungen
            </span>
          </div>
        }>
          <div class="flex items-center gap-3">
            <StarRating rating={props.product.stars} maxStars={5} size="lg" />
            <div class="flex items-baseline gap-2">
              <span class="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                {props.product.stars.toFixed(1)}
              </span>
              <span class="text-base text-gray-500 dark:text-gray-400 font-medium">
                ({props.commentsCount})
              </span>
            </div>
          </div>
        </Show>
      </div>

      {/* Preis */}
      <div class="mb-6">
        <div class="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-xl border-2 border-emerald-200 dark:border-emerald-800">
          <svg class="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
            {formatPrice(props.product.price)}
          </span>
        </div>
      </div>

      {/* Tags */}
      <Show when={props.product.tags?.length > 0}>
        <div class="flex flex-wrap gap-2 mb-6">
          <For each={props.product.tags || []}>
            {(tag) => (
              <span class="px-4 py-1.5 bg-gradient-to-r from-sky-100 to-blue-100 dark:from-sky-900 dark:to-blue-900 text-sky-700 dark:text-sky-300 rounded-full text-sm font-medium shadow-sm">
                {tag.name}
              </span>
            )}
          </For>
        </div>
      </Show>

      {/* Beschreibung */}
      <div class="mb-8 flex-grow">
        <h2 class="text-lg font-semibold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
          <svg class="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Beschreibung
        </h2>
        <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
          {props.product.beschreibung || "Keine Beschreibung vorhanden."}
        </p>
      </div>

      {/* Besitzer Info */}
      <Show when={props.product.User}>
        <div class="border-t dark:border-gray-700 pt-6 mb-6">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
              {props.product.User!.name.charAt(0)}{props.product.User!.surname.charAt(0)}
            </div>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Angeboten von</p>
              <p class="font-semibold text-gray-900 dark:text-white">
                {props.product.User!.name} {props.product.User!.surname}
              </p>
            </div>
          </div>
        </div>
      </Show>

      {/* Buttons */}
      <div class="space-y-3 mt-auto">
        <button
          onClick={props.onRequestTest}
          class="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-3"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Produkttest anfragen
        </button>
        
        <button
          onClick={props.onContact}
          class="w-full py-3 px-6 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 hover:border-sky-500 dark:hover:border-sky-400 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Verkäufer kontaktieren
        </button>
      </div>
    </div>
  );
}
