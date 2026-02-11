import { Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { supabase } from "../lib/supabaseClient"; // ggf. Pfad anpassen
import { useProfile } from "../hooks/profile/useProfile";
import { useProfilePicture } from "../hooks/profile/useProfilePicture";
import { useUserProducts } from "../hooks/profile/useUserProduct";

import ProfileHeader from "../components/profile/Header";
import StatusMessages from "../components/profile/StatusMessages";
import StatsCards from "../components/profile/StatsCard";
import ProgressBar from "../components/profile/ProgressBar";
import ProductGrid from "../components/profile/ProductGrid";

export default function Profile() {
  const navigate = useNavigate(); // navigate(-1) = zurück [web:1009]
  const { user, setUser, loading, error: profileError } = useProfile();

  const {
    uploading,
    error: pictureError,
    success,
    handleFileUpload,
    handleDeletePicture,
  } = useProfilePicture(user, setUser);

  const { products, loading: productsLoading } = useUserProducts(() => user()?.id);

  const goBack = () => navigate(-1); // zurück zur vorherigen Route [web:1009]

  const logout = async () => {
    const { error } = await supabase.auth.signOut(); // Session im Browser entfernen [web:1013]
    if (!error) {
      setUser(null);
      navigate("/login", { replace: true });
    }
  };

  return (
    <div class="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-950">
      <main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top buttons */}
        <div class="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={goBack}
            class="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/15 transition"
          >
            Zurück
          </button>

          <button
            type="button"
            onClick={logout}
            class="px-4 py-2 rounded-lg bg-red-500/80 text-white hover:bg-red-500 transition"
          >
            Ausloggen
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

            <StatusMessages
              error={() => pictureError() || profileError()}
              success={success}
              uploading={uploading}
            />

            <StatsCards user={user!} />
            <ProgressBar user={user!} />
            <ProductGrid products={products} loading={productsLoading} />
          </div>
        </Show>
      </main>
    </div>
  );
}
