import { createEffect } from "solid-js";
import { createStore } from "solid-js/store";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

interface SessionData {
  session: Session | null;
  user: User | null;
  userId: number | null;
  username: string | null;
  accessToken: string | null;  // ✅ JWT Token für API Calls
}

const [sessionStore, setSessionStore] = createStore<SessionData>({
  session: null,
  user: null,
  userId: null,
  username: null,
  accessToken: null,
});

// Helpers
export const isLoggedIn = () => !!sessionStore.session;
export const getAccessToken = () => sessionStore.accessToken;
export const getSession = () => ({
  session: sessionStore.session,
  user: sessionStore.user,
  userId: sessionStore.userId,
  username: sessionStore.username,
  accessToken: sessionStore.accessToken,
});

export const setSession = (data: Partial<SessionData>) => {
  const user = data.user ?? data.session?.user ?? null;
  const userId = user?.app_metadata?.user_id || null;
  const username = user?.app_metadata?.username || user?.email || null;
  
  // ✅ JWT aus session.access_token
  const accessToken = data.session?.access_token || null;

  setSessionStore({
    ...sessionStore,
    ...data,
    user,
    userId,
    username,
    accessToken,
  });
};

export const clearSession = () => {
  setSessionStore({ 
    session: null, 
    user: null, 
    userId: null,
    username: null,
    accessToken: null
  });
  localStorage.removeItem("supabase-session");
};

// ✅ Session Check mit JWT
export const checkSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error("❌ Session check error:", error);
      clearSession();
      return false;
    }

    if (session) {
      console.log("✅ Session found:", session.user.id);
      console.log("🔑 JWT Token:", session.access_token?.substring(0, 20) + "...");
      
      setSession({ 
        session, 
        user: session.user,
        accessToken: session.access_token,
      });
      return true;
    } else {
      console.log("⚠️ No active session");
      clearSession();
      return false;
    }
  } catch (error) {
    console.error("💥 Session check failed:", error);
    clearSession();
    return false;
  }
};

// LocalStorage Sync
export const setupSessionSync = () => {
  createEffect(() => {
    if (sessionStore.session) {
      localStorage.setItem("supabase-session", JSON.stringify({
        session: sessionStore.session,
        user: sessionStore.user,
        accessToken: sessionStore.accessToken,
      }));
      console.log("💾 Session + JWT saved");
    } else {
      localStorage.removeItem("supabase-session");
    }
  });
};

// ✅ Login/Logout Helper
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) console.error("Logout error:", error);
  clearSession();
};

export default sessionStore;
