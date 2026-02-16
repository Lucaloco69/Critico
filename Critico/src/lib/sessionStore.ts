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


let userIdCache: { [authId: string]: number } = {};


let hadValidSession = false;


let authCheckTimeout: any = null;
let lastAuthEvent: string = "";
let lastAuthTime: number = 0;



if (typeof window !== 'undefined') {
  try {
    const cachedData = localStorage.getItem('user_id_cache');
    if (cachedData) {
      userIdCache = JSON.parse(cachedData);
    }
  } catch (err) {
  }
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
export const hadValidSessionBefore = () => hadValidSession;


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

  hadValidSession = true;

  setSessionStore({
    session,
    user: user ?? session.user ?? null,
  });
};


const loadDbUser = async (authId: string) => {
  try {

    if (userIdCache[authId]) {
      setSessionStore({
        userId: userIdCache[authId],
        username: null,
      });
      return;
    }

    let cachedUserId: string | null = null;
    if (typeof window !== 'undefined') {
      cachedUserId = localStorage.getItem(`user_id_${authId}`);
    }

    if (cachedUserId) {
      const userId = Number(cachedUserId);
      userIdCache[authId] = userId;
      setSessionStore({ userId, username: null });
      return;
    }

    const startTime = Date.now();


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

    const result = await Promise.race([queryPromise, timeoutPromise]);
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


    userIdCache[authId] = data.id;
    if (typeof window !== 'undefined') {
      localStorage.setItem(`user_id_${authId}`, String(data.id));

      try {
        localStorage.setItem('user_id_cache', JSON.stringify(userIdCache));
      } catch (err) {
      }
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
  clearAll();

  hadValidSession = false;

  userIdCache = {};

  if (typeof window !== 'undefined') {
    localStorage.removeItem("pendingActivateToken");
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('user_id_')) {
        localStorage.removeItem(key);
      }
    });
  }

  await supabase.auth.signOut();

  window.location.href = "/login";
};


let checkSessionPromise: Promise<boolean> | null = null;

export const checkSession = async (timeoutMs = 5000): Promise<boolean> => {
  if (checkSessionPromise) return checkSessionPromise;

  checkSessionPromise = (async () => {
    try {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('supabase.auth.token') : null;

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Session check timeout')), timeoutMs)
      );

      const sessionPromise = supabase.auth.getSession();

      console.log("🔍 checkSession: Starting race...");
      const { data, error } = await Promise.race([sessionPromise, timeoutPromise]);
      console.log("🔍 checkSession: Race finished", { hasData: !!data, error });

      if (error) {
        console.error("❌ checkSession error:", error);
        return false;
      }

      if (!data.session) {
        console.warn("⚠️ checkSession: No session found");
        clearAll();
        return false;
      }

      const expiresAt = data.session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt ? expiresAt - now : 0;

      if (expiresAt && expiresAt <= now) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError || !refreshData.session) {
          console.error("❌ Refresh failed:", refreshError);
          clearAll();
          await supabase.auth.signOut();
          return false;
        }

        setBaseSession(refreshData.session, refreshData.session.user);
        loadDbUser(refreshData.session.user.id).catch(() => { });
        return true;
      }

      if (timeUntilExpiry < 300) {
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && refreshData.session) {
            setBaseSession(refreshData.session, refreshData.session.user);
            loadDbUser(refreshData.session.user.id).catch(() => { });
            return true;
          }
        } catch (err) {
        }
      }

      setBaseSession(data.session, data.session.user);
      loadDbUser(data.session.user.id).catch(() => { });
      return true;

    } catch (err) {
      console.error("❌ SESSION CHECK Error:", err);
      return false;
    } finally {
      checkSessionPromise = null;
    }
  })();

  return checkSessionPromise;
};


export const initAuthListener = async () => {

  await checkSession();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    const now = Date.now();
    if (event === lastAuthEvent && (now - lastAuthTime) < 200) {
      return;
    }

    lastAuthEvent = event;
    lastAuthTime = now;

    if (authCheckTimeout) {
      clearTimeout(authCheckTimeout);
    }

    authCheckTimeout = setTimeout(async () => {

      if (event === 'TOKEN_REFRESHED') {
        if (session) {
          setBaseSession(session, session.user);
          loadDbUser(session.user.id).catch(() => { });
        }
        return;
      }

      if (event === 'SIGNED_OUT') {
        console.warn("⚠️ AuthListener: SIGNED_OUT event received!");
        clearAll();
        hadValidSession = false;
        userIdCache = {};

        if (typeof window !== 'undefined') {
          localStorage.removeItem("pendingActivateToken");
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('user_id_')) {
              localStorage.removeItem(key);
            }
          });
        }

        window.location.href = "/login";
        return;
      }

      if (!session) {
        clearAll();
        return;
      }

      setBaseSession(session, session.user);
      loadDbUser(session.user.id).catch(() => { });
    }, 100);
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

      try {
        const { data, error } = await supabase.auth.refreshSession();

        if (error || !data.session) {
          console.error("❌ HEALTH: Refresh failed");
          clearAll();
          await supabase.auth.signOut();
        } else {
          setBaseSession(data.session, data.session.user);
          loadDbUser(data.session.user.id).catch(() => { });
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
    }
  });
};


export default sessionStore;
