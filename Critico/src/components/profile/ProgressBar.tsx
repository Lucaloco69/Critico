import { Show, Accessor } from "solid-js";
import { UserProfileComputed } from "../../hooks/profile/useProfile";

interface ProgressBarProps {
  user: Accessor<UserProfileComputed | null>;  // ✅ null erlauben
}

export default function ProgressBar(props: ProgressBarProps) {
  const progressPct = () => {
    const u = props.user();
    if (!u) return 0;
    if (u.trustlevel >= 5) return 100;
    return Math.min(100, Math.round((u.exp / u.expNext) * 100));
  };

  const u = props.user();
  if (!u) return null;  // ✅ Guard clause

  return (
    <div class="p-4 rounded-xl bg-white/5 border border-white/10">
      <div class="flex items-center justify-between text-sm text-gray-300 mb-2">
        <span>Fortschritt zum nächsten Level</span>
        <span>{progressPct()}%</span>
      </div>
      <div class="w-full h-3 bg-white/10 rounded-full overflow-hidden">
        <div class="h-full bg-gradient-to-r from-sky-500 to-blue-600" style={{ width: `${progressPct()}%` }} />
      </div>
      <Show when={u.trustlevel >= 5}>
        <p class="mt-2 text-xs text-gray-300">Du hast das maximale Trustlevel erreicht.</p>
      </Show>
    </div>
  );
}
