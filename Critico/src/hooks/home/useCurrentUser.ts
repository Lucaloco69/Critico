import { createSignal, createEffect } from "solid-js";
import { supabase } from "../../lib/supabaseClient";
import sessionStore, { isLoggedIn } from "../../lib/sessionStore";

export function useCurrentUser() {
  const [userId, setUserId] = createSignal<number | null>(null);
  const [trustlevel, setTrustlevel] = createSignal<number>(0);
  const [loading, setLoading] = createSignal(true);

  createEffect(async () => {
    if (!isLoggedIn() || !sessionStore.user) {
      setUserId(null);
      setTrustlevel(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: userData, error } = await supabase
        .from("User")
        .select("id, trustlevel")
        .eq("auth_id", sessionStore.user.id)
        .maybeSingle();

      if (error) throw error;

      if (userData) {
        setUserId(userData.id);
        setTrustlevel(userData.trustlevel ?? 0);
      }
    } catch (err) {
      console.error("Error loading user:", err);
    } finally {
      setLoading(false);
    }
  });

  return {
    userId,
    trustlevel,
    loading,
  };
}
