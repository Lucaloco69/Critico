import { Show } from "solid-js";
import { useProfile } from "../hooks/profile/useProfile";
import { useProfilePicture } from "../hooks/profile/useProfilePicture";
import { useUserProducts } from "../hooks/profile/useUserProduct";

import ProfileHeader from "../components/profile/Header";
import StatusMessages from "../components/profile/StatusMessages";
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
      <main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Show when={loading()}>
          <div class="flex justify-center items-center py-20">
            <div class="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
          </div>
        </Show>

        <Show when={!loading() && user()}>
          <div class="space-y-6">
            {/* Profile Header Card */}
            <ProfileHeader
              user={user}
              uploading={uploading}
              onFileUpload={handleFileUpload}
              onDelete={handleDeletePicture}
            />

            {/* Status Messages */}
            <StatusMessages
              error={() => pictureError() || profileError()}
              success={success}
              uploading={uploading}
            />

            {/* Stats Cards */}
            <StatsCards user={user!} />

            {/* Progress Bar */}
            <ProgressBar user={user!} />

            {/* Products Grid */}
            <ProductGrid products={products} loading={productsLoading} />
          </div>
        </Show>
      </main>
    </div>
  );
}