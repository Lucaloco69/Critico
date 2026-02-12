// src/components/ProtectedRoute.tsx
import { Component, JSX, Show, createEffect, createSignal, onMount } from 'solid-js';
import { useNavigate, useLocation } from '@solidjs/router';
import { isLoggedIn, checkSession, hadValidSessionBefore } from '../lib/sessionStore';

interface ProtectedRouteProps {
  children: JSX.Element;
}

export const ProtectedRoute: Component<ProtectedRouteProps> = (props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = createSignal(true);
  const [checkedOnce, setCheckedOnce] = createSignal(false);

  onMount(async () => {
    console.log("🔒 PROTECTED ROUTE: Component mounted, checking session...");
    await performCheck();
    setCheckedOnce(true);
  });

  // ✅ Einmaliger Check beim Mount
  onMount(async () => {
    console.log("🔒 PROTECTED ROUTE: Component mounted, checking session...");
    await performCheck();
    setCheckedOnce(true);
  });

  // ✅ Check wenn Route sich ändert
  createEffect(() => {
    // Trigger bei location change
    location.pathname;
    
    if (checkedOnce()) {
      console.log("🔄 PROTECTED ROUTE: Route changed, rechecking...");
      performCheck();
    }
  });

  const performCheck = async () => {
    console.log("═══════════════════════════════════════");
    console.log("🔒 PROTECTED: Checking route:", location.pathname);
    console.log("🔍 PROTECTED: Current isLoggedIn:", isLoggedIn());
    
    setChecking(true);
    
    try {
      const hasSession = await checkSession(3000);
      
      console.log("🔐 PROTECTED: checkSession result:", hasSession);
      console.log("🔐 PROTECTED: isLoggedIn after check:", isLoggedIn());
      console.log("🔐 PROTECTED: hadValidSessionBefore:", hadValidSessionBefore());
      
      if (!hasSession) {
        // ✅ Hatte je eine gültige Session? → Session expired, kein redirectTo
        if (hadValidSessionBefore()) {
          console.log("⏱️ PROTECTED: Session expired (had valid session before)");
          console.log("🚀 PROTECTED: Redirecting to clean login (no redirectTo)...");
          
          navigate('/login', { replace: true });
        } else {
          // Noch nie eingeloggt → redirectTo speichern
          const fullPath = location.pathname + location.search;
          const redirectTo = encodeURIComponent(fullPath);
          
          console.log("❌ PROTECTED: Not authenticated (never logged in)");
          console.log("📦 PROTECTED: Saving path:", fullPath);
          console.log("🚀 PROTECTED: Redirecting to login with redirectTo...");
          
          navigate(`/login?redirectTo=${redirectTo}`, { replace: true });
        }
      } else {
        console.log("✅ PROTECTED: Authenticated, rendering page");
      }
    } catch (err) {
      console.error("❌ PROTECTED: Session check failed:", err);
      navigate('/login', { replace: true });
    } finally {
      setChecking(false);
      console.log("═══════════════════════════════════════");
    }
  };

  return (
    <Show 
      when={!checking()} 
      fallback={
        <div class="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
          <div class="text-center">
            <div class="w-16 h-16 mx-auto border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
            <p class="mt-4 text-gray-600 dark:text-gray-400">Überprüfe Anmeldung...</p>
          </div>
        </div>
      }
    >
      <Show when={isLoggedIn()} fallback={null}>
        {props.children}
      </Show>
    </Show>
  );
};