/**
 * PublicProfile (Page)
 * --------------------
 * Öffentliche Profilseite (ohne Auth-Check) für einen Nutzer, dessen ID aus der Route kommt.
 *
 * - Liest die User-ID aus der URL via useParams() (z.B. Route /user/:userId) und verwendet sie,
 *   um Profil- und Produktdaten für genau diesen Nutzer zu laden. [web:313]
 * - Lädt das Profil aus der "User"-Tabelle über die normale numeric id (nicht über auth_id), damit das
 *   Profil öffentlich abrufbar ist, und berechnet Anzeige-Werte wie reviewCount, expNext und reviewsNext.
 * - Zählt Bewertungen über die Messages-Tabelle (sender_id = User.id), schließt private/direct Nachrichten
 *   aus und zählt nur Einträge mit gesetzten stars (Review-/Rating-Count).
 * - Lädt alle Produkte des Users (Product.owner_id = userId) inkl. product_images und mappt das erste Bild
 *   nach order_index als picture; stars werden auf 0.5-Schritte gerundet.
 * - Rendert eine read-only Profil-UI (kein Upload/Logout) mit Lade-/Error-States, Trustlevel/EXP-Progress und
 *   Produktgrid, wobei die Produktkarten auf /product/<id> verlinken.
 */

import { createSignal, createEffect, Show, For } from "solid-js";
import { A, useNavigate, useParams } from "@solidjs/router";
import { supabase } from "../lib/supabaseClient";

interface UserProfileBase {
  id: number;
  name: string;
  surname: string;
  email: string;
  picture: string | null;
  trustlevel: number;
  exp: number;
}

type UserProfileComputed = UserProfileBase & {
  reviewCount: number;
  expNext: number;
  reviewsNext: number;
};

interface ProductListRow {
  id: number;
  name: string;
  beschreibung: string | null;
  price: number | null;
  owner_id: number;
  stars: number | null;
  product_images?: {
    id: number;
    image_url: string;
    order_index: number;
  }[];
}

type ProductCard = {
  id: number;
  name: string;
  price: number | null;
  stars: number;
  picture: string | null;
};

const EXP_PER_REVIEW = 100;
const PRIVATE_MESSAGE_TYPE = "direct";

const nextExpForLevel = (level: number) => {
  switch (level) {
    case 0:
      return 100;
    case 1:
      return 300;
    case 2:
      return 600;
    case 3:
      return 2000;
    case 4:
      return 5000;
    default:
      return 5000;
  }
};

export default function PublicProfile() {
  const navigate = useNavigate();
  const params = useParams();

  const [user, setUser] = createSignal<UserProfileComputed | null>(null);
  const [products, setProducts] = createSignal<ProductCard[]>([]);
  const [productsLoading, setProductsLoading] = createSignal(false);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal("");

  const loadProductsForUser = async (userId: number) => {
    setProductsLoading(true);

    const { data, error } = await supabase
      .from("Product")
      .select(
        `
        id,
        name,
        beschreibung,
        price,
        owner_id,
        stars,
        product_images (
          id,
          image_url,
          order_index
        )
      `
      )
      .eq("owner_id", userId)
      .order("id", { ascending: false });

    if (error) throw error;

    const mapped: ProductCard[] = (data ?? []).map((p: ProductListRow) => {
      const firstImg =
        p.product_images && p.product_images.length > 0
          ? p.product_images
              .slice()
              .sort((a, b) => a.order_index - b.order_index)[0]?.image_url ?? null
          : null;

      const roundedStars = Math.round(((p.stars ?? 0) * 2)) / 2;

      return {
        id: p.id,
        name: p.name,
        price: p.price,
        stars: roundedStars,
        picture: firstImg,
      };
    });

    setProducts(mapped);
    setProductsLoading(false);
  };

  createEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const userId = Number(params.userId);
        if (!userId || isNaN(userId)) {
          throw new Error("Ungültige User ID");
        }

        // User laden (ohne auth check - öffentliches Profil!)
        const { data: base, error: fetchError } = await supabase
          .from("User")
          .select("id, name, surname, email, picture, trustlevel, exp")
          .eq("id", userId)
          .single();

        if (fetchError) throw fetchError;

        // Bewertungen zählen
        const { count: reviewCount, error: countError } = await supabase
          .from("Messages")
          .select("*", { count: "exact", head: true })
          .eq("sender_id", base.id)
          .neq("message_type", PRIVATE_MESSAGE_TYPE)
          .not("stars", "is", null);

        if (countError) throw countError;

        const rc = reviewCount ?? 0;
        const level = base.trustlevel ?? 0;
        const exp = base.exp ?? 0;
        const expNext = nextExpForLevel(level);
        const reviewsNext = Math.ceil(expNext / EXP_PER_REVIEW);

        setUser({
          ...base,
          trustlevel: level,
          exp,
          reviewCount: rc,
          expNext,
          reviewsNext,
        });

        // Produkte laden
        await loadProductsForUser(base.id);
      } catch (err: any) {
        console.error("Fehler beim Laden:", err);
        setError(err.message || "Profil konnte nicht geladen werden");
      } finally {
        setLoading(false);
        setProductsLoading(false);
      }
    };

    void load();
  });

  const progressPct = () => {
    const u = user();
    if (!u) return 0;
    if (u.trustlevel >= 5) return 100;
    return Math.min(100, Math.round((u.exp / u.expNext) * 100));
  };

  return (
    <div class="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-950">
      <header class="sticky top-0 z-50 bg-white/5 backdrop-blur-md border-b border-white/10">
        <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <A href="/home" class="text-2xl font-bold text-sky-400 hover:text-sky-300 transition-colors">
            Critico
          </A>

          <A
            href="/home"
            class="px-4 py-2 text-gray-200 hover:bg-white/5 rounded-lg transition-colors border border-white/10"
          >
            Zurück
          </A>
        </div>
      </header>

      <main class="max-w-4xl mx-auto px-4 py-8">
        <Show when={loading()}>
          <div class="flex justify-center items-center py-20">
            <div class="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </Show>

        <Show when={error()}>
          <div class="p-6 rounded-2xl bg-red-500/10 border border-red-500/30">
            <p class="text-red-200">{error()}</p>
          </div>
        </Show>

        <Show when={!loading() && !error() && user()}>
          <div class="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl overflow-hidden">
            {/* Banner mit Gradient und Pattern */}
            <div class="relative h-48 bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 overflow-hidden">
              {/* Animated Background Pattern */}
              <div class="absolute inset-0 opacity-20">
                <svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <circle cx="20" cy="20" r="1" fill="white" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>

              {/* Trustlevel Badge im Banner (oben rechts) */}
              <div class="absolute top-6 right-6">
                <div class="flex items-center gap-2 px-4 py-2 bg-black/30 backdrop-blur-md rounded-full border border-white/20">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <span class="text-white font-bold text-lg">Level {user()!.trustlevel}</span>
                </div>
              </div>
            </div>

            <div class="px-8 pb-8">
              {/* Profilbild - überlappt Banner */}
              <div class="relative -mt-20 mb-6 flex items-end gap-6">
                <Show
                  when={user()?.picture}
                  fallback={
                    <div class="w-40 h-40 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center border-4 border-gray-900 shadow-2xl">
                      <svg class="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                  }
                >
                  <img
                    src={user()!.picture!}
                    alt="Profilbild"
                    class="w-40 h-40 rounded-2xl object-cover border-4 border-gray-900 shadow-2xl"
                  />
                </Show>

                {/* Name und Stats nebeneinander */}
                <div class="flex-1 pb-2">
                  <h1 class="text-4xl font-bold text-white mb-2">
                    {user()!.name} {user()!.surname}
                  </h1>
                  <div class="flex items-center gap-6 text-gray-300">
                    <div class="flex items-center gap-2">
                      <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span class="font-semibold">{user()!.reviewCount} Bewertungen</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span class="font-semibold">{user()!.exp} EXP</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats und Produkte */}
              <div class="space-y-6 mt-8">
                {/* Stats Grid */}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* EXP Progress Card */}
                  <div class="p-5 rounded-xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-purple-500/5">
                    <div class="flex items-start justify-between mb-3">
                      <div>
                        <p class="text-sm text-gray-300 mb-1">Erfahrungspunkte</p>
                        <p class="text-3xl font-bold text-white">
                          {user()!.trustlevel >= 5 ? `${user()!.exp}` : `${user()!.exp} / ${user()!.expNext}`}
                        </p>
                      </div>
                      <div class="p-2 bg-purple-500 rounded-lg">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <Show when={user()!.trustlevel < 5}>
                      <div class="mt-3">
                        <div class="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                          <div 
                            class="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500" 
                            style={{ width: `${progressPct()}%` }} 
                          />
                        </div>
                        <p class="text-xs text-gray-400">
                          Noch {user()!.reviewsNext - user()!.reviewCount} Bewertungen bis Level {user()!.trustlevel + 1}
                        </p>
                      </div>
                    </Show>

                    <Show when={user()!.trustlevel >= 5}>
                      <div class="mt-2 px-3 py-1 bg-yellow-500/20 rounded-full inline-block">
                        <p class="text-xs text-yellow-300 font-semibold">🏆 Maximales Level erreicht</p>
                      </div>
                    </Show>
                  </div>

                  {/* Products Count Card */}
                  <div class="p-5 rounded-xl border border-white/10 bg-gradient-to-br from-sky-500/10 to-sky-500/5">
                    <div class="flex items-start justify-between">
                      <div>
                        <p class="text-sm text-gray-300 mb-1">Produkte</p>
                        <p class="text-3xl font-bold text-white">{products().length}</p>
                        <p class="text-xs text-gray-400 mt-1">Eingestellt</p>
                      </div>
                      <div class="p-2 bg-sky-500 rounded-lg">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Produkte Section */}
                <div class="pt-4">
                  <div class="flex items-center justify-between mb-4">
                    <div>
                      <h2 class="text-xl font-bold text-white">Produkte</h2>
                      <p class="text-sm text-gray-300">Alle eingestellten Produkte</p>
                    </div>

                    <div class="text-sm text-gray-300">
                      <span class="px-3 py-1 rounded-full bg-white/5 border border-white/10">
                        {products().length} insgesamt
                      </span>
                    </div>
                  </div>

                  <Show
                    when={!productsLoading()}
                    fallback={
                      <div class="flex justify-center items-center py-12">
                        <div class="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    }
                  >
                    <Show
                      when={products().length > 0}
                      fallback={
                        <div class="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                          <p class="text-sm text-gray-200">Noch keine Produkte eingestellt.</p>
                        </div>
                      }
                    >
                      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        <For each={products()}>
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
              </div>
            </div>
          </div>
        </Show>
      </main>
    </div>
  );
}
