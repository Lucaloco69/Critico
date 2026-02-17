import { Accessor } from "solid-js";
import { UserProfileComputed } from "../../hooks/profile/useProfile";
import { t } from "../../lib/i18n";

interface StatsCardsProps {
  user: Accessor<UserProfileComputed | null>;
}

export default function StatsCards(props: StatsCardsProps) {
  const u = props.user();
  if (!u) return null;

  return (
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {/* Experience Card */}
      <div class="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-md p-6 transition-colors">
        <div class="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />

        <div class="relative">
          <div class="flex items-center justify-center w-14 h-14 rounded-xl bg-purple-500/20 border border-purple-500/30 mb-4">
            <svg class="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>

          <h2 class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{t("profileStatsCards.expTitle")}</h2>

          <p class="text-3xl font-bold text-white mb-1">
            {u.trustlevel >= 5 ? `${u.exp}` : `${u.exp} / ${u.expNext}`}
            <span class="text-lg text-gray-600 dark:text-gray-400 ml-1">{t("profileStatsCards.expUnit")}</span>
          </p>

          <p class="text-xs text-gray-600 dark:text-gray-400">
            {u.trustlevel >= 5
              ? t("profileStatsCards.reviewsOnly", { count: u.reviewCount })
              : t("profileStatsCards.reviewsProgress", { count: u.reviewCount, total: u.reviewsNext })}
          </p>
        </div>
      </div>

      {/* Written Reviews Card */}
      <div class="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-md p-6 transition-colors">
        <div class="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl" />

        <div class="relative">
          <div class="flex items-center justify-center w-14 h-14 rounded-xl bg-sky-500/20 border border-sky-500/30 mb-4">
            <svg class="w-7 h-7 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976 2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </div>

          <h2 class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{t("profileStatsCards.writtenReviewsTitle")}</h2>
          <p class="text-4xl font-bold text-white">{u.reviewCount}</p>
        </div>
      </div>

      {/* Trust Level Card */}
      <div class="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-md p-6 transition-colors">
        <div class="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />

        <div class="relative">
          <div class="flex items-center justify-center w-14 h-14 rounded-xl bg-emerald-500/20 border border-emerald-500/30 mb-4">
            <svg class="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>

          <h2 class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{t("profileStatsCards.trustLevelTitle")}</h2>
          <p class="text-4xl font-bold text-white">{u.trustlevel}</p>
        </div>
      </div>
    </div>
  );
}
