import { Show } from "solid-js";
import { useProfile } from "../hooks/profile/useProfile";
import { useProfilePicture } from "../hooks/profile/useProfilePicture";
import { useUserProducts } from "../hooks/profile/useUserProduct";
import ProfileHeader from "../components/profile/Header";
import ProfilePicture from "../components/profile/ProfilePicture";
import StatusMessages from "../components/profile/StatusMessages";
import ProfileInfo from "../components/profile/ProfileInfo";
import StatsCards from "../components/profile/StatsCard";
import ProgressBar from "../components/profile/ProgressBar";
import ProductGrid from "../components/profile/ProductGrid";

export default function Profile() {
  const { user, setUser, loading, error: profileError } = useProfile();

  const {
    uploading,
    error: pictureError,
    success,
    handleFileUpload,
    handleDeletePicture,
  } = useProfilePicture(user, setUser);

  const { products, loading: productsLoading } = useUserProducts(() => user()?.id);

  return (
    <div class="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-950">
      <ProfileHeader />

      <main class="max-w-4xl mx-auto px-4 py-8">
        <Show when={loading()}>
          <div class="flex justify-center items-center py-20">
            <div class="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </Show>

        <Show when={!loading() && user()}>
          <div class="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl overflow-hidden">
            <div class="h-32 bg-gradient-to-r from-sky-500/70 to-blue-600/70"></div>

            <div class="px-8 pb-8">
              <ProfilePicture
                user={user}
                uploading={uploading}
                onFileUpload={handleFileUpload}
                onDelete={handleDeletePicture}
              />

              <StatusMessages error={() => pictureError() || profileError()} success={success} uploading={uploading} />

              <div class="space-y-6">
                <ProfileInfo user={user!} />
                <StatsCards user={user!} />
                <ProgressBar user={user!} />
                <ProductGrid products={products} loading={productsLoading} />
              </div>
            </div>
          </div>
        </Show>
      </main>
    </div>
  );
}
