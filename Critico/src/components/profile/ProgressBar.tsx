import { Show, Accessor } from "solid-js";
import { UserProfileComputed } from "../../hooks/profile/useProfile";

interface ProgressBarProps {
  user: Accessor<UserProfileComputed | null>;
}

export default function ProgressBar(props: ProgressBarProps) {
  const progressPct = () => {
    const u = props.user();
    if (!u) return 0;
    if (u.trustlevel >= 5) return 100;
    return Math.min(100, Math.round((u.exp / u.expNext) * 100));
  };

  const u = props.user();
  if (!u) return null;

  return (
    <div class="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-medium text-gray-400">Fortschritt zum nächsten Level</h3>
        <span class="text-sm font-semibold text-white">{progressPct()}%</span>
      </div>
      
      <div class="relative w-full h-4 bg-white/5 rounded-full overflow-hidden border border-white/10">
        <div 
          class="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 rounded-full transition-all duration-700 ease-out" 
          style={{ width: `${progressPct()}%` }} 
        >
          <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </div>
      </div>
      
      <Show when={u.trustlevel >= 5}>
        <div class="mt-4 flex items-center gap-2 text-sm text-green-400">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          <span class="font-medium">Maximales Trustlevel erreicht</span>
        </div>
      </Show>
    </div>
  );
}