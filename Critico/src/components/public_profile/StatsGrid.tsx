import type { UserProfileComputed } from "../../routes/PublicProfile";
import { t } from "../../lib/i18n";

export default function StatsGrid(props: { user: UserProfileComputed; productsCount: number }) {
  const u = () => props.user;

  return (
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="rounded-2xl bg-gradient-to-br from-gray-800 to-gray-800/80 border-2 border-white/20 shadow-lg p-5 hover:border-yellow-400/40 transition-colors">
        <div class="flex items-center gap-3">
          <div class="h-11 w-11 rounded-xl bg-yellow-500/20 border border-yellow-400/30 grid place-items-center">
            <svg class="h-6 w-6 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <div>
            <p class="text-sm text-white/70">{t("publicProfileStatsGrid.reviewsLabel")}</p>
            <p class="text-2xl font-bold text-white">{u().reviewCount}</p>
          </div>
        </div>
      </div>

      <div class="rounded-2xl bg-gradient-to-br from-gray-800 to-gray-800/80 border-2 border-white/20 shadow-lg p-5 hover:border-sky-400/40 transition-colors">
        <div class="flex items-center gap-3">
          <div class="h-11 w-11 rounded-xl bg-sky-500/20 border border-sky-400/30 grid place-items-center">
            <svg class="h-6 w-6 text-sky-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
            </svg>
          </div>
          <div>
            <p class="text-sm text-white/70">{t("publicProfileStatsGrid.productsLabel")}</p>
            <p class="text-2xl font-bold text-white">{props.productsCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
