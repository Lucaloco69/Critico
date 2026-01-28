/**
 * Profile (Page)
 * --------------
 * Profilseite für den eingeloggten Nutzer inkl. Level-/EXP-Anzeige, Review-Statistiken, Profilbild-Upload
 * sowie Übersicht der eigenen Produkte.
 *
 * - Erzwingt Login: Wenn keine Session vorhanden ist, wird auf /login umgeleitet.
 * - Lädt das User-Profil aus der "User"-Tabelle (über auth_id) und berechnet zusätzliche Werte:
 *   reviewCount (Anzahl Bewertungen mit stars, ohne private/direct Messages), expNext (EXP-Schwelle fürs nächste Level)
 *   und reviewsNext (wie viele Reviews dafür nötig sind).
 * - Lädt alle Produkte des Users (Product.owner_id = userId) inkl. product_images und mappt das erste Bild nach
 *   order_index als picture für die Produktkarten; stars werden auf 0.5-Schritte gerundet.
 * - Ermöglicht Profilbild-Management:
 *   - Upload: Bild wird in Supabase Storage (Bucket: profile_pictures) hochgeladen, anschließend wird per
 *     storage.from(...).getPublicUrl(filePath) die öffentliche URL erzeugt und in "User.picture" gespeichert. [web:298]
 *   - Löschen: Entfernt die Datei aus Storage und setzt "User.picture" auf null.
 * - Logout: supabase.auth.signOut() meldet den Nutzer ab (entfernt die Session im Browser) und danach wird
 *   der lokale sessionStore geleert und zu /login navigiert. [web:305]
 */

import { createSignal, createEffect, Show, For } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { supabase } from "../lib/supabaseClient";
import { isLoggedIn, getSession, clearSession } from "../lib/sessionStore";

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
      return 5000; // L5 cap
  }
};

export default function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = createSignal<UserProfileComputed | null>(null);
  const [products, setProducts] = createSignal<ProductCard[]>([]);
  const [productsLoading, setProductsLoading] = createSignal(false);

  const [loading, setLoading] = createSignal(true);
  const [uploading, setUploading] = createSignal(false);
  const [error, setError] = createSignal("");
  const [success, setSuccess] = createSignal("");

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
      if (!isLoggedIn()) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        setLoading(true);
        setError("");
        setSuccess("");

        const session = getSession();
        if (!session?.user) throw new Error("Keine Session");

        // User laden
        const { data: base, error: fetchError } = await supabase
          .from("User")
          .select("id, name, surname, email, picture, trustlevel, exp")
          .eq("auth_id", session.user.id)
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

  const handleFileUpload = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file || !user()) return;

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Nicht authentifiziert");

      // Altes Bild löschen (optional)
      if (user()!.picture) {
        const oldPath = user()!.picture!.split("/").slice(-2).join("/");
        await supabase.storage.from("profile_pictures").remove([oldPath]);
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${authUser.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("profile_pictures")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("profile_pictures").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("User")
        .update({ picture: publicUrl })
        .eq("id", user()!.id);

      if (updateError) throw updateError;

      setUser({ ...user()!, picture: publicUrl });
      setSuccess("Profilbild erfolgreich aktualisiert!");
    } catch (err: any) {
      console.error("Upload-Fehler:", err);
      setError(err.message || "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePicture = async () => {
    if (!user()?.picture || !confirm("Profilbild wirklich löschen?")) return;

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const oldPath = user()!.picture!.split("/").slice(-2).join("/");
      const { error: deleteError } = await supabase.storage
        .from("profile_pictures")
        .remove([oldPath]);
      if (deleteError) throw deleteError;

      const { error: updateError } = await supabase
        .from("User")
        .update({ picture: null })
        .eq("id", user()!.id);
      if (updateError) throw updateError;

      setUser({ ...user()!, picture: null });
      setSuccess("Profilbild gelöscht");
    } catch (err: any) {
      console.error("Löschen fehlgeschlagen:", err);
      setError(err.message || "Löschen fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearSession();
    navigate("/login", { replace: true });
  };

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

          <div class="flex items-center gap-3">
            <A
              href="/home"
              class="px-4 py-2 text-gray-200 hover:bg-white/5 rounded-lg transition-colors border border-white/10"
            >
              Zurück
            </A>
            <button
              onClick={handleLogout}
              class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors"
            >
              Abmelden
            </button>
          </div>
        </div>
      </header>

      <main class="max-w-4xl mx-auto px-4 py-8">
        <Show when={loading()}>
          <div class="flex justify-center items-center py-20">
            <div class="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </Show>

        <Show when={!loading() && user()}>
          {/* Container im Glassmorphism Stil */}
          <div class="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl overflow-hidden">
            <div class="h-32 bg-gradient-to-r from-sky-500/70 to-blue-600/70"></div>

            <div class="px-8 pb-8">
              <div class="relative -mt-16 mb-6">
                <div class="relative inline-block">
                  <Show
                    when={user()?.picture}
                    fallback={
                      <div class="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center border-4 border-white/10">
                        <svg class="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      class="w-32 h-32 rounded-full object-cover border-4 border-white/10 shadow-lg"
                    />
                  </Show>

                  <label class="absolute bottom-0 right-0 p-2 bg-sky-500 hover:bg-sky-600 rounded-full cursor-pointer shadow-lg transition-colors">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploading()} class="hidden" />
                  </label>
                </div>

                <Show when={user()?.picture}>
                  <button
                    onClick={handleDeletePicture}
                    disabled={uploading()}
                    class="ml-4 px-3 py-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-500 text-white text-sm rounded-lg transition-colors"
                  >
                    Bild löschen
                  </button>
                </Show>
              </div>

              <Show when={error()}>
                <div class="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p class="text-sm text-red-200">{error()}</p>
                </div>
              </Show>

              <Show when={success()}>
                <div class="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p class="text-sm text-green-200">{success()}</p>
                </div>
              </Show>

              <Show when={uploading()}>
                <div class="mb-4 p-3 bg-sky-500/10 border border-sky-500/30 rounded-lg">
                  <div class="text-sm text-sky-200 flex items-center gap-2">
                    <div class="w-4 h-4 border-2 border-sky-200 border-t-transparent rounded-full animate-spin"></div>
                    Wird hochgeladen...
                  </div>
                </div>
              </Show>

              <div class="space-y-6">
                <div>
                  <h1 class="text-3xl font-bold text-white">
                    {user()!.name} {user()!.surname}
                  </h1>
                  <p class="text-gray-300">{user()!.email}</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="p-4 rounded-xl border border-white/10 bg-gradient-to-br from-green-500/10 to-green-500/5">
                    <div class="flex items-center gap-3">
                      <div class="p-2 bg-green-500 rounded-lg">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p class="text-sm text-gray-300">Trustlevel</p>
                        <p class="text-2xl font-bold text-white">{user()!.trustlevel}</p>
                      </div>
                    </div>
                  </div>

                  <div class="p-4 rounded-xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-purple-500/5">
                    <div class="flex items-center gap-3">
                      <div class="p-2 bg-purple-500 rounded-lg">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div class="min-w-0">
                        <p class="text-sm text-gray-300">Erfahrungspunkte</p>
                        <p class="text-2xl font-bold text-white">
                          {user()!.trustlevel >= 5 ? `${user()!.exp} EXP` : `${user()!.exp} / ${user()!.expNext} EXP`}
                        </p>
                        <p class="text-xs text-gray-300">
                          {user()!.trustlevel >= 5
                            ? `${user()!.reviewCount} Bewertungen`
                            : `${user()!.reviewCount} / ${user()!.reviewsNext} Bewertungen`}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div class="p-4 rounded-xl border border-white/10 bg-gradient-to-br from-sky-500/10 to-sky-500/5">
                    <div class="flex items-center gap-3">
                      <div class="p-2 bg-sky-500 rounded-lg">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 0 00-.363-1.118l-3.976 2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 0 00.951-.69l1.519-4.674z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p class="text-sm text-gray-300">Geschriebene Bewertungen</p>
                        <p class="text-2xl font-bold text-white">{user()!.reviewCount}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div class="flex items-center justify-between text-sm text-gray-300 mb-2">
                    <span>Fortschritt zum nächsten Level</span>
                    <span>{progressPct()}%</span>
                  </div>
                  <div class="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-sky-500 to-blue-600" style={{ width: `${progressPct()}%` }} />
                  </div>
                  <Show when={user()!.trustlevel >= 5}>
                    <p class="mt-2 text-xs text-gray-300">Du hast das maximale Trustlevel erreicht.</p>
                  </Show>
                </div>

                {/* PRODUKTE (schöner) */}
                <div class="pt-4">
                  <div class="flex items-center justify-between mb-4">
                    <div>
                      <h2 class="text-xl font-bold text-white">Produkte</h2>
                      <p class="text-sm text-gray-300">Alle eingestellten Produkte auf einen Blick</p>
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
