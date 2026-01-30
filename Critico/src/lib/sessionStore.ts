import { createEffect, createMemo } from "solid-js";
import { createStore } from "solid-js/store";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

interface SessionData {
  session: Session | null;
  user: User | null;
  userId: number | null;
  username: string | null;
}

const [sessionStore, setSessionStore] = createStore<SessionData>({
  session: null,
  user: null,
  userId: null,
  username: null,
});

// ✅ Reactive derived values (statt "helper function statt getter")
export const isLoggedIn = createMemo(() => !!sessionStore.session);
export const currentUserId = createMemo(() => sessionStore.userId);
export const currentUsername = createMemo(() => sessionStore.username);

// (Optional) falls du das irgendwo brauchst:
export const getSession = () => ({
  session: sessionStore.session,
  user: sessionStore.user,
  userId: sessionStore.userId,
  username: sessionStore.username,
});

export const setSession = (data: Partial<SessionData>) => {
  const userId = (data.user as any)?.app_metadata?.user_id ?? null;
  const username = (data.user as any)?.app_metadata?.username ?? null;

  setSessionStore({
    ...data,
    userId,
    username,
  });
};

export const clearSession = () => {
  setSessionStore({
    session: null,
    user: null,
    userId: null,
    username: null,
  });
};

// ✅ Einmal initial Session holen + dann live auf Auth-Events reagieren
export const initAuthListener = async () => {
  // Initial
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    clearSession();
  } else {
    setSession({ session: data.session, user: data.session.user });
  }

  // Realtime auth updates
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!session) clearSession();
    else setSession({ session, user: session.user });
  });

  return subscription; // caller unsubscribed in cleanup
};

// LocalStorage Sync (wie bei dir)
export const setupSessionSync = () => {
  createEffect(() => {
    if (sessionStore.session) {
      localStorage.setItem(
        "supabase-session",
        JSON.stringify({
          session: sessionStore.session,
          user: sessionStore.user,
        }),
      );
    } else {
      localStorage.removeItem("supabase-session");
    }
  });
};

export default sessionStore;
