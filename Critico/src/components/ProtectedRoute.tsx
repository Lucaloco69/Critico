// src/components/ProtectedRoute.tsx
import { Component, JSX, Show, createEffect, createSignal } from 'solid-js';
import { useNavigate, useLocation } from '@solidjs/router';
import { isLoggedIn, checkSession } from '../lib/sessionStore';

interface ProtectedRouteProps {
  children: JSX.Element;
}

export const ProtectedRoute: Component<ProtectedRouteProps> = (props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = createSignal(true);

  createEffect(() => {
    const check = async () => {
      console.log("═══════════════════════════════════════");
      console.log("🔒 PROTECTED: Checking route:", location.pathname);
      console.log("🔍 PROTECTED: Current search:", location.search);
      
      try {
        const hasSession = await checkSession(3000);
        
        console.log("🔐 PROTECTED: checkSession result:", hasSession);
        console.log("🔐 PROTECTED: isLoggedIn():", isLoggedIn());
        
        if (!hasSession) {
          const fullPath = location.pathname + location.search;
          const redirectTo = encodeURIComponent(fullPath);
          
          console.log("❌ PROTECTED: Not authenticated");
          console.log("📦 PROTECTED: Full path to save:", fullPath);
          console.log("🔐 PROTECTED: Encoded redirectTo:", redirectTo);
          console.log("🚀 PROTECTED: Redirecting to: /login?redirectTo=" + redirectTo);
          
          navigate(`/login?redirectTo=${redirectTo}`, { replace: true });
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

    check();
  });

  return (
    <Show 
      when={!checking()} 
      fallback={
        <div class="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
          <div class="text-center">
            <div class="w-16 h-16 mx-auto border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
            <p class="mt-4 text-gray-600 dark:text-gray-400">Authentifizierung wird überprüft...</p>
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
