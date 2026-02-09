import { A } from "@solidjs/router";
import { supabase } from "../../lib/supabaseClient";
import { clearSession } from "../../lib/sessionStore";
import { useNavigate } from "@solidjs/router";

export default function ProfileHeader() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <header class="sticky top-0 z-50 bg-white/5 backdrop-blur-md border-b border-white/10">
      <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <A href="/home" class="text-2xl font-bold text-sky-400 hover:text-sky-300 transition-colors">
          Critico
        </A>

        <div class="flex items-center gap-3">
          <A
            href="/home"
            class="px-4 py-2 text-gray-200 hover:bg-white/5 rounded-lg transition-colors border border-white/10"
          >
            Zurück
          </A>
          <button
            onClick={handleLogout}
            class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors"
          >
            Abmelden
          </button>
        </div>
      </div>
    </header>
  );
}
