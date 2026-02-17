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
import { BackButton } from "../components/share/BackButton";

export default function Profile() {
  const navigate = useNavigate();
  const { user, setUser, loading, error: profileError } = useProfile();

  const { uploading, error: pictureError, success, handleFileUpload, handleDeletePicture } = useProfilePicture(
    user,
    setUser,
  );

  const { products, loading: productsLoading, hasMore, loadMore } = useUserProducts(() => user()?.id);

  const handleLogout = async () => {
    try {
      await clearSession();
    } catch (err) {
      console.error("❌ Logout error:", err);
    }
  };


  return (
    <div class="min-h-screen bg-gray-50 dark:bg-linear-to-br dark:from-gray-900 dark:via-slate-900 dark:to-gray-950">
      <main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="flex items-center justify-between mb-6">
          <BackButton
            onClick={() => navigate("/home")}
            label={t("profile.back")}
            class="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          />

          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{t("profile.pageTitle")}</h1>
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
              onLogout={handleLogout}
            />

            <StatusMessages error={() => pictureError() || profileError()} success={success} uploading={uploading} />

            <StatsCards user={user!} />
            <ProgressBar user={user!} />
            <ProductGrid products={products} loading={productsLoading} hasMore={hasMore} onLoadMore={loadMore} />
          </div>
        </Show>
      </main>
    </div>
  );
}
