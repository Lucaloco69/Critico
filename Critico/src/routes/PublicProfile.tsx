import { createEffect, createMemo, createSignal, Show } from "solid-js";
import { A, useParams } from "@solidjs/router";
import { supabase } from "../lib/supabaseClient";
import { t } from "../lib/i18n";

import Header from "../components/public_profile/Header";
import StatsGrid from "../components/public_profile/StatsGrid";
import ProductsSection from "../components/public_profile/ProductsSection";

import { BackButton } from "../components/ui/BackButton";
import {
  EXP_PER_REVIEW,
  PRIVATE_MESSAGE_TYPE,
  firstProductImage,
  nextExpForLevel,
  roundStars,
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
  description: string | null;
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
  description: string;
  price: number | null;
  stars: number;
  picture: string | null;
  owner_id: number;
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
            description:beschreibung,
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
        description: p.description ?? "",
        price: p.price,
        stars: 0,
        picture: firstProductImage(p.product_images),
        owner_id: p.owner_id,
      }));

      const productIds = mapped.map((p) => p.id);
      if (productIds.length > 0) {
        const { data: ratingsData } = await supabase
          .from("Messages")
          .select("product_id, stars")
          .in("product_id", productIds)
          .eq("message_type", "product")
          .not("stars", "is", null);

        const ratingsMap = new Map<number, number[]>();
        (ratingsData || []).forEach((r: any) => {
          if (!ratingsMap.has(r.product_id)) ratingsMap.set(r.product_id, []);
          ratingsMap.get(r.product_id)?.push(r.stars);
        });

        mapped.forEach((p) => {
          const productRatings = ratingsMap.get(p.id);
          if (productRatings && productRatings.length > 0) {
            const total = productRatings.reduce((sum, r) => sum + r, 0);
            const avg = total / productRatings.length;
            p.stars = roundStars(avg);
          } else {
            const original = data?.find(d => d.id === p.id)?.stars;
            p.stars = roundStars(original);
          }
        });
      }

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

        if (!uid || Number.isNaN(uid)) throw new Error(t("publicProfile.invalidUserId"));

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
        setError(err?.message || t("publicProfile.profileLoadFailed"));
      } finally {
        setLoading(false);
        setProductsLoading(false);
      }
    })();
  });

  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div class="max-w-4xl mx-auto px-4 py-8">
        <div class="flex items-center justify-between mb-6">
          <BackButton />
        </div>
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
      </div>
    </div>
  );
}
