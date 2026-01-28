/**
 * ProductInfo
 * -----------
 * Detail-Informationsbereich für ein Produkt (rechte Spalte auf der Product-Detail-Seite).
 *
 * - Zeigt Name, Durchschnittsbewertung (StarRating + Wert + Anzahl Bewertungen) und optional den Preis.
 * - Zeigt Verkäufer-Box inkl. Profilbild und Link zum Verkäuferprofil (oder eigenes Profil, falls Owner).
 * - Rendert Beschreibung und Tag-/Kategorie-Badges.
 * - Stellt Aktionsbuttons bereit:
 *   - "Zum Testen anfragen" nur für Nicht-Owner (triggert onRequestTest).
 *   - "Verkäufer kontaktieren" (triggert onContact; nimmt volle Breite, wenn aktueller User der Owner ist).
 */

import { Show, For } from "solid-js";
import { A } from "@solidjs/router";
import type { Product } from "../types/product";
import StarRating from "./StarRating";

interface ProductInfoProps {
  product: Product;
  commentsCount: number;
  currentUserId: number | null;
  onRequestTest: () => void;
  onContact: () => void;
}

export default function ProductInfo(props: ProductInfoProps) {
  return (
    <div class="flex flex-col h-full">
      {/* Product Name */}
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        {props.product.name}
      </h1>

      {/* Rating */}
      <div class="flex items-center gap-3 mb-4">
        <StarRating rating={props.product.stars} maxStars={5} size="lg" />
        <span class="text-2xl font-semibold text-gray-900 dark:text-white">
          {props.product.stars.toFixed(1)}
        </span>
        <span class="text-gray-500 dark:text-gray-400">
          ({props.commentsCount} {props.commentsCount === 1 ? "Bewertung" : "Bewertungen"})
        </span>
      </div>

      {/* Price */}
      <Show when={props.product.price !== null}>
        <div class="mb-6">
          <span class="text-3xl font-bold text-sky-600 dark:text-sky-400">
            {props.product.price!.toFixed(2)} €
          </span>
        </div>
      </Show>

      {/* Owner Info (klickbar -> /profile oder /profile/:userId) mit Profilbild */}
      <Show when={props.product.User}>
        <A
          href={props.currentUserId === props.product.owner_id ? "/profile" : `/profile/${props.product.owner_id}`}
          class="block mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl
                 hover:bg-gray-100 dark:hover:bg-gray-700/70
                 border border-transparent hover:border-sky-200 dark:hover:border-sky-800
                 transition-colors"
        >
          <div class="flex items-center gap-3">
            {/* Avatar mit Profilbild */}
            <Show
              when={props.product.User!.picture}
              fallback={
                <div class="w-12 h-12 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                  {props.product.User!.name.charAt(0)}
                </div>
              }
            >
              <img
                src={props.product.User!.picture!}
                alt={`${props.product.User!.name} ${props.product.User!.surname}`}
                class="w-12 h-12 rounded-full object-cover shadow-md"
              />
            </Show>

            <div class="min-w-0">
              <p class="text-sm text-gray-500 dark:text-gray-400">Verkäufer</p>
              <p class="font-semibold text-gray-900 dark:text-white truncate">
                {props.product.User!.name} {props.product.User!.surname}
              </p>
              <p class="text-xs text-sky-600 dark:text-sky-300 mt-0.5">
                {props.currentUserId === props.product.owner_id ? "Dein Profil" : "Profil ansehen"}
              </p>
            </div>
          </div>
        </A>
      </Show>

      {/* Description */}
      <div class="mb-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Beschreibung
        </h3>
        <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
          {props.product.beschreibung}
        </p>
      </div>

      {/* Tags */}
      <Show when={props.product.tags && props.product.tags.length > 0}>
        <div class="mb-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Kategorien
          </h3>
          <div class="flex flex-wrap gap-2">
            <For each={props.product.tags}>
              {(tag) => (
                <span class="px-3 py-1 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-full text-sm font-medium">
                  {tag.name}
                </span>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* Buttons */}
      <div class="flex gap-3 mt-auto">
        <Show when={props.currentUserId !== props.product.owner_id}>
          <button
            onClick={props.onRequestTest}
            class="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Zum Testen anfragen
          </button>
        </Show>

        <button
          onClick={props.onContact}
          class={`${props.currentUserId === props.product.owner_id ? "w-full" : "flex-1"} px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2`}
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
