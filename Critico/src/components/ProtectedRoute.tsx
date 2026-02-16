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

  const hasPotentialSession = () => {
    if (typeof window === 'undefined') return false;
    const key = 'supabase.auth.token';
    const val = localStorage.getItem(key);
    return !!val;
  };

  const [isReady, setIsReady] = createSignal(false);
  const [checkedOnce, setCheckedOnce] = createSignal(false);

  createEffect(() => {
  });

  onMount(async () => {
    const potential = hasPotentialSession();


    if (potential) {
      setIsReady(true);
    }


    if (potential && !isLoggedIn()) {
      await performCheck();
    } else if (!isLoggedIn()) {
      await performCheck();
    }
    setCheckedOnce(true);
  });

  createEffect(() => {
    location.pathname;
    if (checkedOnce()) {
      performCheck();
    }
  });

  const performCheck = async () => {
    const potential = hasPotentialSession();
    const loggedIn = isLoggedIn();

    try {
      const hasSession = await checkSession(5000);

      if (!hasSession) {
        if (hasPotentialSession()) {
          setIsReady(true);
          return;
        }


        if (hadValidSessionBefore()) {
          navigate('/login', { replace: true });
        } else {
          const fullPath = location.pathname + location.search;
          const redirectTo = encodeURIComponent(fullPath);
          navigate(`/login?redirectTo=${redirectTo}`, { replace: true });
        }
      } else {

        setIsReady(true);
      }

    } catch (err) {
      navigate('/login', { replace: true });
    } finally {
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