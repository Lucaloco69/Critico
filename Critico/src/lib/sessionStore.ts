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

// ✅ In-Memory Cache für schnelle Lookups
let userIdCache: { [authId: string]: number } = {};

// ✅ NEU: Track ob je eine gültige Session existierte
let hadValidSession = false;

// Lade Cache beim Start aus localStorage
try {
  const cachedData = localStorage.getItem('user_id_cache');
  if (cachedData) {
    userIdCache = JSON.parse(cachedData);
    console.log("📦 Loaded user ID cache:", Object.keys(userIdCache).length, "entries");
  }
} catch (err) {
  console.warn("⚠️ Failed to load user ID cache:", err);
}

const [sessionStore, setSessionStore] = createStore<SessionData>({
  session: null,
  user: null,
  userId: null,
  username: null,
});

export const isLoggedIn = createMemo(() => !!sessionStore.session);
export const currentUserId = createMemo(() => sessionStore.userId);
export const currentUsername = createMemo(() => sessionStore.username);
export const hadValidSessionBefore = () => hadValidSession; // ✅ NEU: Export

export const getSession = () => ({
  session: sessionStore.session,
  user: sessionStore.user,
  userId: sessionStore.userId,
  username: sessionStore.username,
});

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
  
  hadValidSession = true; // ✅ NEU: Merke dass wir eine Session hatten
  
  setSessionStore({
    session,
    user: user ?? session.user ?? null,
  });
};

const loadDbUser = async (authId: string) => {
  try {
    console.log("🔍 Loading DB user for auth_id:", authId);
    
    // ✅ 1. In-Memory Cache Check (instant)
    if (userIdCache[authId]) {
      console.log("⚡ Cache HIT (in-memory)! userId:", userIdCache[authId]);
      setSessionStore({
        userId: userIdCache[authId],
        username: null,
      });
      return;
    }
    
    // ✅ 2. localStorage Cache Check
    const cachedUserId = localStorage.getItem(`user_id_${authId}`);
    if (cachedUserId) {
      console.log("⚡ Cache HIT (localStorage)! userId:", cachedUserId);
      const userId = Number(cachedUserId);
      userIdCache[authId] = userId;
      setSessionStore({ userId, username: null });
      return;
    }
    
    const startTime = Date.now();

    // ✅ 3. DB Query mit 2 Sekunden Timeout
    const timeoutPromise = new Promise<{ data: null; error: null }>((resolve) => 
      setTimeout(() => {
        const elapsed = Date.now() - startTime;
        console.warn(`⚠️ DB query timeout after ${elapsed}ms`);
        resolve({ data: null, error: null });
      }, 2000)
    );

    const queryPromise = supabase
      .from("User")
      .select("id")
      .eq("auth_id", authId)
      .maybeSingle();

    console.log("📤 DB query...");
    const result = await Promise.race([queryPromise, timeoutPromise]);
    const elapsed = Date.now() - startTime;
    
    if (elapsed < 2000) {
      console.log(`⏱️ Query OK in ${elapsed}ms`);
    }

    const { data, error } = result;

    if (error) {
      console.error("❌ Supabase error:", {
        code: error.code,
        message: error.message,
      });
      setSessionStore({ userId: null, username: null });
      return;
    }

    if (!data) {
      console.warn("⚠️ No data (timeout or not found)");
      setSessionStore({ userId: null, username: null });
      return;
    }

    console.log("✅ DB user loaded, userId:", data.id);
    
    // ✅ 4. Cache überall
    userIdCache[authId] = data.id;
    localStorage.setItem(`user_id_${authId}`, String(data.id));
    
    try {
      localStorage.setItem('user_id_cache', JSON.stringify(userIdCache));
    } catch (err) {
      console.warn("⚠️ Failed to save cache:", err);
    }
    
    setSessionStore({
      userId: Number(data.id),
      username: null,
    });
  } catch (err: any) {
    console.error("❌ Error loading DB user:", err);
    setSessionStore({ userId: null, username: null });
  }
};

export const setSession = (data: Partial<SessionData>) => {
  if ("session" in data) {
    const sess = data.session ?? null;
    setBaseSession(sess, data.user ?? null);

    if (sess?.user?.id) {
      loadDbUser(sess.user.id).catch(() => {
        console.warn("⚠️ Failed to load DB user");
      });
    }
    return;
  }

  setSessionStore(data as any);
};

export const clearSession = async () => {
  console.log("🚪 Clearing session and signing out...");
  clearAll();
  
  hadValidSession = false; // ✅ NEU: Reset bei explizitem Logout
  
  // ✅ Alle Caches löschen
  localStorage.removeItem("pendingActivateToken");
  userIdCache = {};
  
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('user_id_')) {
      localStorage.removeItem(key);
    }
  });
  
  await supabase.auth.signOut();
  
  // ✅ Wichtig: window.location.href entfernt alle URL Parameter
  console.log("🔄 Redirecting to clean /login (no redirectTo)");
  window.location.href = "/login";
};

export const checkSession = async (timeoutMs = 5000) => {
  try {
    console.log("═══════════════════════════════════════");
    console.log("🔍 SESSION CHECK: Starting...");
    
    const storedToken = localStorage.getItem('supabase.auth.token');
    console.log("💾 Token exists:", storedToken ? "YES" : "NO");
    
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Session check timeout')), timeoutMs)
    );
    
    const sessionPromise = supabase.auth.getSession();
    
    const { data, error } = await Promise.race([sessionPromise, timeoutPromise]);

    if (error) {
      console.error("❌ Error getting session:", error);
      clearAll();
      console.log("═══════════════════════════════════════");
      return false;
    }

    if (!data.session) {
      console.log("ℹ️ No session found");
      clearAll();
      console.log("═══════════════════════════════════════");
      return false;
    }

    console.log("✅ Session found:", data.session.user.email);
    console.log("⏰ Expires:", new Date(data.session.expires_at! * 1000).toLocaleString());

    const expiresAt = data.session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = expiresAt ? expiresAt - now : 0;
    
    console.log("⏱️ Time until expiry:", Math.floor(timeUntilExpiry / 60), "minutes");

    // Token abgelaufen? → Refresh
    if (expiresAt && expiresAt <= now) {
      console.warn("⚠️ Token expired, refreshing...");
      
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshData.session) {
        console.error("❌ Refresh failed:", refreshError);
        clearAll();
        await supabase.auth.signOut();
        console.log("═══════════════════════════════════════");
        return false;
      }
      
      console.log("✅ Session refreshed");
      setBaseSession(refreshData.session, refreshData.session.user);
      loadDbUser(refreshData.session.user.id).catch(() => {});
      console.log("═══════════════════════════════════════");
      return true;
    }

    // Token läuft bald ab? → Refresh
    if (timeUntilExpiry < 300) {
      console.warn("⚠️ Token expires soon, refreshing...");
      
      try {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (!refreshError && refreshData.session) {
          console.log("✅ Prophylactic refresh OK");
          setBaseSession(refreshData.session, refreshData.session.user);
          loadDbUser(refreshData.session.user.id).catch(() => {});
          console.log("═══════════════════════════════════════");
          return true;
        }
      } catch (err) {
        console.warn("⚠️ Prophylactic refresh failed");
      }
    }

    // Token gültig
    console.log("✅ Using valid token");
    setBaseSession(data.session, data.session.user);
    loadDbUser(data.session.user.id).catch(() => {});

    console.log("═══════════════════════════════════════");
    return true;
  } catch (err) {
    console.error("❌ SESSION CHECK Error:", err);
    clearAll();
    await supabase.auth.signOut().catch(() => {});
    console.log("═══════════════════════════════════════");
    return false;
  }
};

export const initAuthListener = async () => {
  console.log("🚀 Initializing auth listener...");
  
  await checkSession();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    console.log("🔔 Auth state changed:", event);

    if (event === 'TOKEN_REFRESHED') {
      console.log("🔄 Token refreshed");
      if (session) {
        setBaseSession(session, session.user);
        loadDbUser(session.user.id).catch(() => {});
      }
      return;
    }

    if (event === 'SIGNED_OUT') {
      console.log("🚪 User signed out");
      clearAll();
      hadValidSession = false; // ✅ NEU: Reset auch hier
      userIdCache = {};
      localStorage.removeItem("pendingActivateToken");
      
      // ✅ Nach Logout: Zu /login OHNE redirectTo
      window.location.href = "/login";
      return;
    }

    if (!session) {
      console.log("ℹ️ No session");
      clearAll();
      return;
    }

    console.log("✅ Session active:", session.user.email);
    setBaseSession(session, session.user);
    loadDbUser(session.user.id).catch(() => {});
  });

  return subscription;
};

export const startSessionHealthCheck = () => {
  const CHECK_INTERVAL = 60000;

  const intervalId = setInterval(async () => {
    const sess = sessionStore.session;
    
    if (!sess) return;

    const expiresAt = sess.expires_at;
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = expiresAt ? expiresAt - now : 0;
    
    if (timeUntilExpiry < 300 && timeUntilExpiry > 0) {
      console.log("⚠️ HEALTH: Token expires soon, refreshing...");
      
      try {
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error || !data.session) {
          console.error("❌ HEALTH: Refresh failed");
          clearAll();
          await supabase.auth.signOut();
        } else {
          console.log("✅ HEALTH: Refreshed");
          setBaseSession(data.session, data.session.user);
          loadDbUser(data.session.user.id).catch(() => {});
        }
      } catch (err) {
        console.error("❌ HEALTH: Error", err);
        clearAll();
      }
    }
  }, CHECK_INTERVAL);

  return () => clearInterval(intervalId);
};

export const setupSessionSync = () => {
  createEffect(() => {
    if (sessionStore.userId) {
      console.log("💾 Session synced, userId:", sessionStore.userId);
    }
  });
};

export default sessionStore;
