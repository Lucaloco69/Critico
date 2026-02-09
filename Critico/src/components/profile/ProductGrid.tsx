import { Show, For, Accessor } from "solid-js";
import { A } from "@solidjs/router";
import { ProductCard } from "../../hooks/profile/useUserProduct";

interface ProductGridProps {
  products: Accessor<ProductCard[]>;
  loading: Accessor<boolean>;
}

export default function ProductGrid(props: ProductGridProps) {
  return (
    <div class="pt-4">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-xl font-bold text-white">Produkte</h2>
          <p class="text-sm text-gray-300">Alle eingestellten Produkte auf einen Blick</p>
        </div>

        <div class="text-sm text-gray-300">
          <span class="px-3 py-1 rounded-full bg-white/5 border border-white/10">
            {props.products().length} insgesamt
          </span>
        </div>
      </div>

      <Show
        when={!props.loading()}
        fallback={
          <div class="flex justify-center items-center py-12">
            <div class="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        }
      >
        <Show
          when={props.products().length > 0}
          fallback={
            <div class="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <p class="text-sm text-gray-200">Noch keine Produkte eingestellt.</p>
            </div>
          }
        >
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <For each={props.products()}>
              {(p) => (
                <A
                  href={`/product/${p.id}`}
                  class="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md
                         shadow-[0_10px_30px_rgba(0,0,0,0.25)]
                         hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(0,0,0,0.35)]
                         hover:border-white/20 hover:ring-1 hover:ring-sky-400/40
                         transition-all duration-300"
                >
                  <div class="relative aspect-[4/3] bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
                    <Show
                      when={p.picture}
                      fallback={
                        <div class="w-full h-full flex items-center justify-center text-gray-400">
                          <svg class="w-10 h-10 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M4 16l4-4a3 5 0 014 0l4 4m-2-2l1-1a3 5 0 014 0l2 2M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      }
                    >
                      <img
                        src={p.picture!}
                        alt={p.name}
                        class="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                        loading="lazy"
                      />
                    </Show>

                    <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                    <div class="absolute left-3 top-3">
                      <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-black/40 border border-white/15 text-white backdrop-blur">
                        {p.price != null ? `${p.price} €` : "Preis auf Anfrage"}
                      </span>
                    </div>

                    <div class="absolute right-3 top-3">
                      <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-black/40 border border-white/15 text-white backdrop-blur">
                        ★ {p.stars.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div class="p-4">
                    <p class="font-semibold text-white leading-snug line-clamp-2">{p.name}</p>

                    <div class="mt-3 flex items-center justify-between">
                      <span class="text-xs text-gray-300">Details ansehen</span>

                      <span class="inline-flex items-center gap-1 text-xs text-sky-300 group-hover:text-sky-200 transition-colors">
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
