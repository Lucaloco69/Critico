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
  const [checking, setChecking] = createSignal(true);
  const [checkedOnce, setCheckedOnce] = createSignal(false);

  onMount(async () => {
    await performCheck();
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

    setChecking(true);

    try {
      const hasSession = await checkSession(3000);


      if (!hasSession) {
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
            <p class="mt-4 text-gray-600 dark:text-gray-400">{t("protectedRoute.checking")}</p>
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