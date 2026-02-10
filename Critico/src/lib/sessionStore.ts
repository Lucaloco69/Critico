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

const loadDbUser = async (authId: string, timeoutMs = 5000) => {
  try {
    console.log("🔍 Loading DB user for auth_id:", authId);
    
    // ✅ Timeout wrapper für DB queries
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('DB query timeout')), timeoutMs)
    );
    
    const queryPromise = supabase
      .from("User")
      .select("id")
      .eq("auth_id", authId)
      .maybeSingle();

    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

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

export const checkSession = async (timeoutMs = 5000) => {
  try {
    console.log("🔍 Checking session...");
    
    // ✅ Timeout für getSession
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Session check timeout')), timeoutMs)
    );
    
    const sessionPromise = supabase.auth.getSession();
    
    const { data, error } = await Promise.race([sessionPromise, timeoutPromise]);

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

    // ✅ Check if token is expired
    const expiresAt = data.session.expires_at;
    if (expiresAt && expiresAt * 1000 < Date.now()) {
      console.warn("⚠️ Session expired, clearing...");
      clearAll();
      await supabase.auth.signOut();
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
    // ✅ Bei Timeout: Session löschen
    await supabase.auth.signOut().catch(() => {});
    return false;
  }
};

// ✅ Muss einmal in App.tsx gestartet werden
export const initAuthListener = async () => {
  console.log("🚀 Initializing auth listener...");
  
  // ✅ Initial session check mit Timeout
  await checkSession();

  // ✅ Listen for auth state changes
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    console.log("🔔 Auth state changed:", event);

    // ✅ Handle token refresh errors
    if (event === 'TOKEN_REFRESHED') {
      console.log("🔄 Token refreshed successfully");
    }

    if (event === 'SIGNED_OUT') {
      console.log("🚪 User signed out");
      clearAll();
      return;
    }

    if (!session) {
      console.log("ℹ️ No session in auth state change");
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

// ✅ Optional: Session health check (für lange offene Tabs)
export const startSessionHealthCheck = () => {
  const CHECK_INTERVAL = 60000; // 1 Minute

  const intervalId = setInterval(async () => {
    const sess = sessionStore.session;
    
    if (!sess) return;

    // Check if token will expire soon (innerhalb 5 Minuten)
    const expiresAt = sess.expires_at;
    if (expiresAt && expiresAt * 1000 - Date.now() < 300000) {
      console.log("⚠️ Token expires soon, refreshing...");
      
      try {
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error || !data.session) {
          console.error("❌ Failed to refresh session:", error);
          clearAll();
          await supabase.auth.signOut();
        } else {
          console.log("✅ Session refreshed successfully");
          setBaseSession(data.session, data.session.user);
        }
      } catch (err) {
        console.error("❌ Error refreshing session:", err);
        clearAll();
      }
    }
  }, CHECK_INTERVAL);

  return () => clearInterval(intervalId);
};

// ✅ Nicht mehr nötig - JWT wird automatisch von Supabase verwaltet
export const setupSessionSync = () => {
  createEffect(() => {
    if (sessionStore.userId) {
      console.log("💾 Session synced, userId:", sessionStore.userId);
    }
  });
};

export default sessionStore;
