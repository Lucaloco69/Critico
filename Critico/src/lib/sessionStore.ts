import { createEffect, createMemo } from "solid-js";
import { createStore } from "solid-js/store";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

interface SessionData {
  session: Session | null;
  user: User | null;

  // ✅ deine interne DB User.id (number)
  userId: number | null;

  // optional, falls du eine username Spalte hast
  username: string | null;
}

const [sessionStore, setSessionStore] = createStore<SessionData>({
  session: null,
  user: null,
  userId: null,
  username: null,
});

// ✅ reactive derived values
export const isLoggedIn = createMemo(() => !!sessionStore.session);
export const currentUserId = createMemo(() => sessionStore.userId);
export const currentUsername = createMemo(() => sessionStore.username);

// ✅ compatibility snapshot (falls profile.tsx o.ä. es nutzt)
export const getSession = () => ({
  session: sessionStore.session,
  user: sessionStore.user,
  userId: sessionStore.userId,
  username: sessionStore.username,
});

// --- intern ---
const clearAll = () => {
  setSessionStore({
    session: null,
    user: null,
    userId: null,
    username: null,
  });
};

const setBaseSession = (session: Session | null, user?: User | null) => {
  if (!session) {
    clearAll();
    return;
  }
  setSessionStore({
    session,
    user: user ?? session.user ?? null,
  });
};

const loadDbUser = async (authId: string) => {
  const { data, error } = await supabase
    .from("User")
    .select("id")          // ✅ username raus!
    .eq("auth_id", authId)
    .maybeSingle();

  console.log("🧩 loadDbUser", { authId, data, error });

  if (error || !data) {
    setSessionStore({ userId: null, username: null });
    return;
  }

  setSessionStore({
    userId: Number(data.id),
    username: null,        // ✅ solange du keine username-spalte hast
  });
};



// ✅ compatibility: falls login.tsx noch setSession nutzt
export const setSession = (data: Partial<SessionData>) => {
  // wenn session gesetzt/gelöscht werden soll
  if ("session" in data) {
    const sess = data.session ?? null;
    setBaseSession(sess, data.user ?? null);

    if (sess?.user?.id) {
      loadDbUser(sess.user.id).catch(() => setSessionStore({ userId: null, username: null }));
    }
    return;
  }

  // sonst partielle updates
  setSessionStore(data as any);
};

export const clearSession = () => {
  clearAll();
};

export const checkSession = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      clearAll();
      return false;
    }

    setBaseSession(data.session, data.session.user);

    try {
      await loadDbUser(data.session.user.id);
    } catch {
      setSessionStore({ userId: null, username: null });
    }

    return true;
  } catch {
    clearAll();
    return false;
  }
};

// ✅ Muss einmal in App.tsx gestartet werden
export const initAuthListener = async () => {
  await checkSession();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (_event, session) => {
    if (!session) {
      clearAll();
      return;
    }

    setBaseSession(session, session.user);

    try {
      await loadDbUser(session.user.id);
    } catch {
      setSessionStore({ userId: null, username: null });
    }
  });

  return subscription;
};

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
