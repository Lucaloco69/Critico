// src/routes/PublicProfile.tsx
import { createEffect, createMemo, createSignal, Show } from "solid-js";
import { A, useParams } from "@solidjs/router";
import { supabase } from "../lib/supabaseClient";

import Header from "../components/public_profile/Header";
import StatsGrid from "../components/public_profile/StatsGrid";
import ProductsSection from "../components/public_profile/ProductsSection";

import {
  EXP_PER_REVIEW,
  PRIVATE_MESSAGE_TYPE,
  firstProductImage,
  nextExpForLevel,
  roundStarsHalf,
} from "../lib/publicProfileUtils";

export interface UserProfileBase {
  id: number;
  name: string;
  surname: string;
  email: string;
  picture: string | null;
  trustlevel: number;
  exp: number;
}

export type UserProfileComputed = UserProfileBase & {
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

export type ProductCard = {
  id: number;
  name: string;
  price: number | null;
  stars: number;
  picture: string | null;
};

export default function PublicProfile() {
  const params = useParams();

  const [user, setUser] = createSignal<UserProfileComputed | null>(null);
  const [products, setProducts] = createSignal<ProductCard[]>([]);
  const [productsLoading, setProductsLoading] = createSignal(false);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal("");

  const userId = createMemo(() => Number(params.userId));

  const loadProductsForUser = async (uid: number) => {
    setProductsLoading(true);
    try {
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
          `,
        )
        .eq("owner_id", uid)
        .order("id", { ascending: false })
        .overrideTypes<ProductListRow[]>();

      if (error) throw error;

      const mapped: ProductCard[] = (data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        stars: roundStarsHalf(p.stars),
        picture: firstProductImage(p.product_images),
      }));

      setProducts(mapped);
    } finally {
      setProductsLoading(false);
    }
  };

  createEffect(() => {
    const uid = userId();

    (async () => {
      try {
        setLoading(true);
        setError("");

        if (!uid || Number.isNaN(uid)) throw new Error("Ungültige User ID");

        const { data: base, error: fetchError } = await supabase
          .from("User")
          .select("id, name, surname, email, picture, trustlevel, exp")
          .eq("id", uid)
          .single()
          .overrideTypes<UserProfileBase>();

        if (fetchError) throw fetchError;

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

        // Wir berechnen das weiter (falls du es später doch brauchst), zeigen es aber nicht im UI.
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

        await loadProductsForUser(base.id);
      } catch (err: any) {
        console.error("Fehler beim Laden:", err);
        setError(err?.message || "Profil konnte nicht geladen werden");
      } finally {
        setLoading(false);
        setProductsLoading(false);
      }
    })();
  });

  return (
    <div class="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-950">
      <header class="sticky top-0 z-50 bg-white/5 backdrop-blur-md border-b border-white/10">
        <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <A href="/home" class="text-2xl font-bold text-sky-400 hover:text-sky-300 transition-colors">
            Critico
          </A>

          <A href="/home" class="px-4 py-2 text-gray-200 hover:bg-white/5 rounded-lg transition-colors border border-white/10">
            Zurück
          </A>
        </div>
      </header>

      <main class="max-w-4xl mx-auto px-4 py-8">
        <Show when={loading()}>
          <div class="flex justify-center items-center py-20">
            <div class="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
          </div>
        </Show>

        <Show when={error()}>
          <div class="p-6 rounded-2xl bg-red-500/10 border border-red-500/30">
            <p class="text-red-200">{error()}</p>
          </div>
        </Show>

        <Show when={!loading() && !error() && user()}>
          {(() => {
            const u = user()!;
            return (
              <Header user={u}>
                <div class="space-y-6">
                  <StatsGrid user={u} productsCount={products().length} />
                  <ProductsSection products={products()} productsLoading={productsLoading()} />
                </div>
              </Header>
            );
          })()}
        </Show>
      </main>
    </div>
  );
}
