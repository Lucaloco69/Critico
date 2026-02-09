import { createSignal, createEffect } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { supabase } from "../../lib/supabaseClient";
import { isLoggedIn, getSession } from "../../lib/sessionStore";

interface UserProfileBase {
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

export function useProfile() {
  const navigate = useNavigate();

  const [user, setUser] = createSignal<UserProfileComputed | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal("");

  createEffect(() => {
    const load = async () => {
      if (!isLoggedIn()) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        setLoading(true);
        setError("");

        const session = getSession();
        if (!session?.user) throw new Error("Keine Session");

        const { data: base, error: fetchError } = await supabase
          .from("User")
          .select("id, name, surname, email, picture, trustlevel, exp")
          .eq("auth_id", session.user.id)
          .single();

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
      } catch (err: any) {
        console.error("Fehler beim Laden:", err);
        setError(err.message || "Profil konnte nicht geladen werden");
      } finally {
        setLoading(false);
      }
    };

    void load();
  });

  return {
    user,
    setUser,
    loading,
    error,
  };
}
