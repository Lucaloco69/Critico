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

  // ✅ OPTIMISTIC CHECK: Wenn wir einen Token im Storage haben, gehen wir davon aus, dass wir eingeloggt sind.
  // Das erlaubt sofortiges Rendering der geschützten Route (z.B. Home), während im Hintergrund verifiziert wird.
  const hasPotentialSession = () => !!localStorage.getItem('supabase.auth.token');

  const [checking, setChecking] = createSignal(!isLoggedIn() && !hasPotentialSession());
  const [checkedOnce, setCheckedOnce] = createSignal(false);

  onMount(async () => {
    // Wenn wir optimistisch rendern (Token da, aber noch nicht verifiziert), checken wir trotzdem im Hintergrund
    if (hasPotentialSession() && !isLoggedIn()) {
      await performCheck();
    } else if (!isLoggedIn()) {
      await performCheck();
    }
    setCheckedOnce(true);
  });

  // ✅ Check wenn Route sich ändert
  createEffect(() => {
    // Trigger bei location change
    location.pathname;

    if (checkedOnce()) {
      performCheck();
    }
  });

  const performCheck = async () => {
    // Nur Spinner zeigen, wenn wir KEINE Vermutung auf Session haben
    if (!hasPotentialSession() && !isLoggedIn()) {
      setChecking(true);
    }

    try {
      // Erhöhe Timeout auf 5s für langsamere Verbindungen
      const hasSession = await checkSession(5000); // War 3000

      if (!hasSession) {
        // ✅ NEU: Wenn checkSession fehlschlägt (z.B. Timeout), aber der Token noch da ist,
        // gehen wir von einem Netzwerkproblem aus und lassen den User drin (Optimistic).
        // Wenn der Token wirklich ungültig wäre, hätte checkSession() ihn via signOut() gelöscht.
        if (hasPotentialSession()) {
          console.warn("⚠️ Session check failed/timed out, but token persists. Allowing optimistic access.");
          setChecking(false);
          return;
        }

        // ✅ Hatte je eine gültige Session? → Session expired, kein redirectTo
        if (hadValidSessionBefore()) {
          navigate('/login', { replace: true });
        } else {
          // Noch nie eingeloggt → redirectTo speichern
          const fullPath = location.pathname + location.search;
          const redirectTo = encodeURIComponent(fullPath);
          navigate(`/login?redirectTo=${redirectTo}`, { replace: true });
        }
      } else {
        // Session bestätigt
        setChecking(false);
      }

    } catch (err) {
      console.error("❌ PROTECTED: Session check failed:", err);
      navigate('/login', { replace: true });
    } finally {
      setChecking(false);
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
      {/* 
          ✅ Render:
          1. Wenn wir bereits sicher eingeloggt sind (isLoggedIn)
          2. ODER wenn wir einen Token haben und optimistisch rendern (hasPotentialSession)
      */}
      <Show when={isLoggedIn() || hasPotentialSession()} fallback={null}>
        {props.children}
      </Show>
    </Show>
  );
};