import { createEffect } from "solid-js";
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

// Helper function statt Getter
export const isLoggedIn = () => !!sessionStore.session;
export const getSession = () => {
  return {
    session: sessionStore.session,
    user: sessionStore.user,
    userId: sessionStore.userId,
    username: sessionStore.username,
  };
};

export const setSession = (data: Partial<SessionData>) => {
  const userId = data.user?.app_metadata?.user_id || null;
  const username = data.user?.app_metadata?.username || null;
  
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
    username: null 
  });
};

// Session aus Supabase prüfen (ohne onMount!)
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
      setSession({ 
        session, 
        user: session.user 
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

// LocalStorage Sync (wird in App.tsx mit createEffect verwendet)
export const setupSessionSync = () => {
  createEffect(() => {
    if (sessionStore.session) {
      localStorage.setItem("supabase-session", JSON.stringify({
        session: sessionStore.session,
        user: sessionStore.user,
      }));
      console.log("💾 Session saved to localStorage");
    } else {
      localStorage.removeItem("supabase-session");
      console.log("🗑️ Session removed from localStorage");
    }
  });
};

export default sessionStore;
