import { Show, For, Accessor } from "solid-js";
import { A } from "@solidjs/router";
import { ProductCard } from "../../hooks/profile/useUserProduct";

interface ProductGridProps {
  products: Accessor<ProductCard[]>;
  loading: Accessor<boolean>;
}

export default function ProductGrid(props: ProductGridProps) {
  return (
    <div class="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-bold text-white">Produkte</h2>
          <p class="text-sm text-gray-400 mt-0.5">Alle eingestellten Produkte auf einen Blick</p>
        </div>

        <div class="px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
          <span class="text-sm font-medium text-gray-300">{props.products().length} insgesamt</span>
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
              <p class="text-gray-400 font-medium">Noch keine Produkte eingestellt</p>
              <p class="text-sm text-gray-500 mt-1">Erstelle dein erstes Produkt, um loszulegen</p>
            </div>
          }
        >
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <For each={props.products()}>
              {(p) => (
                <A
                  href={`/product/${p.id}`}
                  class="group relative overflow-hidden rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm
                         hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20
                         hover:border-white/20 hover:bg-white/10
                         transition-all duration-300"
                >
                  {/* Image Container */}
                  <div class="relative aspect-[4/3] bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
                    <Show
                      when={p.picture}
                      fallback={
                        <div class="w-full h-full flex items-center justify-center">
                          <svg class="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      }
                    >
                      <img
                        src={p.picture!}
                        alt={p.name}
                        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </Show>

                    {/* Gradient Overlay */}
                    <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {/* Price Badge */}
                    <div class="absolute left-3 top-3">
                      <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-black/50 border border-white/20 text-white backdrop-blur-sm">
                        {p.price != null ? `${p.price} €` : "Preis auf Anfrage"}
                      </span>
                    </div>

                    {/* Rating Badge */}
                    <div class="absolute right-3 top-3">
                      <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-black/50 border border-white/20 text-white backdrop-blur-sm">
                        <svg class="w-3.5 h-3.5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {p.stars.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div class="p-4">
                    <h3 class="font-semibold text-white leading-snug line-clamp-2 mb-3 group-hover:text-sky-300 transition-colors">
                      {p.name}
                    </h3>

                    <div class="flex items-center justify-between text-xs">
                      <span class="text-gray-400">Details ansehen</span>
                      <span class="flex items-center gap-1 text-sky-400 group-hover:gap-2 transition-all">
                        Öffnen
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </A>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </div>
  );
}