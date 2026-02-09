import { createEffect, createMemo } from "solid-js";
import { createStore } from "solid-js/store";
import type { Session, User } from "@supabase/supabase-js";
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

// ✅ Reactive derived values
export const isLoggedIn = createMemo(() => !!sessionStore.session);
export const currentUserId = createMemo(() => sessionStore.userId);
export const currentUsername = createMemo(() => sessionStore.username);

// ✅ Compatibility snapshot
export const getSession = () => ({
  session: sessionStore.session,
  user: sessionStore.user,
  userId: sessionStore.userId,
  username: sessionStore.username,
});

// --- Intern ---
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
  try {
    console.log("🔍 Loading DB user for auth_id:", authId);
    
    const { data, error } = await supabase
      .from("User")
      .select("id")
      .eq("auth_id", authId)
      .maybeSingle();

    console.log("🧩 loadDbUser result:", { authId, data, error });

    if (error || !data) {
      console.warn("⚠️ No DB user found for auth_id:", authId);
      setSessionStore({ userId: null, username: null });
      return;
    }

    console.log("✅ DB user loaded, userId:", data.id);
    setSessionStore({
      userId: Number(data.id),
      username: null,
    });
  } catch (err) {
    console.error("❌ Error loading DB user:", err);
    setSessionStore({ userId: null, username: null });
  }
};

// ✅ Compatibility: falls login.tsx noch setSession nutzt
export const setSession = (data: Partial<SessionData>) => {
  if ("session" in data) {
    const sess = data.session ?? null;
    setBaseSession(sess, data.user ?? null);

    if (sess?.user?.id) {
      loadDbUser(sess.user.id).catch(() => setSessionStore({ userId: null, username: null }));
    }
    return;
  }

  setSessionStore(data as any);
};

export const clearSession = async () => {
  console.log("🚪 Clearing session and signing out...");
  clearAll();
  await supabase.auth.signOut();
};

export const checkSession = async () => {
  try {
    console.log("🔍 Checking session...");
    
    // ✅ Supabase verwaltet JWT automatisch via localStorage
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error("❌ Error getting session:", error);
      clearAll();
      return false;
    }

    if (!data.session) {
      console.log("ℹ️ No session found");
      clearAll();
      return false;
    }

    console.log("✅ Session found:", data.session.user.email);
    setBaseSession(data.session, data.session.user);

    try {
      await loadDbUser(data.session.user.id);
    } catch {
      setSessionStore({ userId: null, username: null });
    }

    return true;
  } catch (err) {
    console.error("❌ Error in checkSession:", err);
    clearAll();
    return false;
  }
};

// ✅ Muss einmal in App.tsx gestartet werden
export const initAuthListener = async () => {
  console.log("🚀 Initializing auth listener...");
  
  // ✅ Initial session check
  await checkSession();

  // ✅ Listen for auth state changes
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    console.log("🔔 Auth state changed:", event);

    if (!session) {
      console.log("🚪 User signed out");
      clearAll();
      return;
    }

    console.log("✅ User signed in:", session.user.email);
    setBaseSession(session, session.user);

    try {
      await loadDbUser(session.user.id);
    } catch {
      setSessionStore({ userId: null, username: null });
    }
  });

  return subscription;
};

// ✅ Nicht mehr nötig - JWT wird automatisch von Supabase verwaltet
export const setupSessionSync = () => {
  // Optional: Nur für zusätzliche custom data
  createEffect(() => {
    if (sessionStore.userId) {
      console.log("💾 Session synced, userId:", sessionStore.userId);
    }
  });
};

export default sessionStore;
