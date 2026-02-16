// src/components/ProtectedRoute.tsx
import { Component, JSX, Show, createEffect, createSignal, onMount } from 'solid-js';
import { useNavigate, useLocation } from '@solidjs/router';
import { isLoggedIn, checkSession, hadValidSessionBefore } from '../lib/sessionStore';
import { t } from '../lib/i18n';

interface ProtectedRouteProps {
  children: JSX.Element;
}

export const ProtectedRoute: Component<ProtectedRouteProps> = (props) => {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ OPTIMISTIC CHECK: Wenn wir einen Token im Storage haben, gehen wir davon aus, dass wir eingeloggt sind.
  // Das erlaubt sofortiges Rendering der geschützten Route (z.B. Home), während im Hintergrund verifiziert wird.
  const hasPotentialSession = () => {
    if (typeof window === 'undefined') return false;
    const key = 'supabase.auth.token';
    const val = localStorage.getItem(key);
    console.log(`🛡️ hasPotentialSession: key='${key}', value='${val ? val.substring(0, 15) + '...' : 'null'}'`);
    return !!val;
  };

  // ✅ Fix Hydration Mismatch: Always start false (matching server), then flip on client
  const [isReady, setIsReady] = createSignal(false);
  const [checkedOnce, setCheckedOnce] = createSignal(false);

  createEffect(() => {
    console.log("🛡️ isReady state changed:", isReady());
  });

  onMount(async () => {
    const potential = hasPotentialSession();
    console.log("🛡️ MOUNT: Potential session?", potential);

    // Immediately show content if we have a token (Optimistic)
    if (potential) {
      console.log("🛡️ Optimistic enable");
      setIsReady(true);
    }

    // Background verify
    if (potential && !isLoggedIn()) {
      await performCheck();
    } else if (!isLoggedIn()) {
      await performCheck();
    }
    setCheckedOnce(true);
  });

  // ✅ Check wenn Route sich ändert
  createEffect(() => {
    location.pathname; // Trigger
    if (checkedOnce()) {
      performCheck();
    }
  });

  const performCheck = async () => {
    const potential = hasPotentialSession();
    const loggedIn = isLoggedIn();
    console.log(`🛡️ performCheck: potential=${potential}, loggedIn=${loggedIn}`);

    try {
      // Erhöhe Timeout auf 5s für langsamere Verbindungen
      const hasSession = await checkSession(5000);

      if (!hasSession) {
        if (hasPotentialSession()) {
          console.warn("⚠️ Session check failed/timed out, but token persists. Allowing optimistic access.");
          setIsReady(true);
          return;
        }

        console.log("❌ ProtectedRoute: No session, redirecting to login");

        if (hadValidSessionBefore()) {
          navigate('/login', { replace: true });
        } else {
          const fullPath = location.pathname + location.search;
          const redirectTo = encodeURIComponent(fullPath);
          navigate(`/login?redirectTo=${redirectTo}`, { replace: true });
        }
      } else {
        // Session bestätigt
        setIsReady(true);
      }

    } catch (err) {
      console.error("❌ PROTECTED: Session check failed:", err);
      navigate('/login', { replace: true });
    } finally {
      // If we fell through (e.g. error but didn't redirect), ensure ready? 
      // Actually strictly, if we failed we redirected. 
      // But if we are here and didn't redirect, maybe we should show content?
      // Lets rely on specific logic above.
    }
  };

  return (
    <Show
      when={isReady()}
      fallback={
        <div class="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
          <div class="text-center">
            <div class="w-16 h-16 mx-auto border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
            <p class="mt-4 text-gray-600 dark:text-gray-400">{t("protectedRoute.checking")}</p>
          </div>
        </div>
      }
    >
      {props.children}
    </Show>
  );
};