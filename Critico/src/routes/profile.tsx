import { Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { supabase } from "../lib/supabaseClient";
import { useProfile } from "../hooks/profile/useProfile";
import { useProfilePicture } from "../hooks/profile/useProfilePicture";
import { useUserProducts } from "../hooks/profile/useUserProduct";
import { clearSession } from "../lib/sessionStore";

import ProfileHeader from "../components/profile/Header";
import StatusMessages from "../components/profile/StatusMessages";
import StatsCards from "../components/profile/StatsCard";
import ProgressBar from "../components/profile/ProgressBar";
import ProductGrid from "../components/profile/ProductGrid";
import { t } from "../lib/i18n";

export default function Profile() {
  const navigate = useNavigate();
  const { user, setUser, loading, error: profileError } = useProfile();

  const { uploading, error: pictureError, success, handleFileUpload, handleDeletePicture } = useProfilePicture(
    user,
    setUser,
  );

  const { products, loading: productsLoading } = useUserProducts(() => user()?.id);

  const handleLogout = async () => {
    try {
      // ✅ clearSession navigiert automatisch zu /login OHNE Parameter
      await clearSession();
    } catch (err) {
      console.error("❌ Logout error:", err);
    }
  };

  return (
    <div class="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-950">
      <main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/home")}
            class="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {t("profile.back")}
          </button>

          <button
            onClick={handleLogout}
            class="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            {t("profile.logout")}
          </button>
        </div>

        <Show when={loading()}>
          <div class="flex justify-center items-center py-20">
            <div class="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
          </div>
        </Show>

        <Show when={!loading() && user()}>
          <div class="space-y-6">
            <ProfileHeader
              user={user}
              uploading={uploading}
              onFileUpload={handleFileUpload}
              onDelete={handleDeletePicture}
            />

            <StatusMessages error={() => pictureError() || profileError()} success={success} uploading={uploading} />

            <StatsCards user={user!} />
            <ProgressBar user={user!} />
            <ProductGrid products={products} loading={productsLoading} />
          </div>
        </Show>
      </main>
    </div>
  );
}
