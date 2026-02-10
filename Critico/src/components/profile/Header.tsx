import type { ParentProps, Accessor } from "solid-js";
import { Show } from "solid-js";
import type { UserProfileComputed } from "../../hooks/profile/useProfile";

type Props = ParentProps<{
  user: Accessor<UserProfileComputed | null>;
  uploading: Accessor<boolean>;
  onFileUpload: (e: Event) => void;
  onDelete: () => void;
}>;

export default function Header(props: Props) {
  const u = () => props.user();

  return (
    <section class="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl overflow-hidden">
      <div class="h-32 bg-gradient-to-r from-sky-600 via-blue-700 to-indigo-700" />

      <div class="px-6 sm:px-8 pb-8 pt-6">
        <div class="flex flex-col sm:flex-row sm:items-start gap-5 sm:gap-6">
          {/* Avatar + upload */}
          <div class="relative -mt-16 self-center sm:self-start">
            <div class="relative inline-block">
              <Show
                when={u()?.picture}
                fallback={
                  <div class="w-32 h-32 rounded-2xl bg-slate-800 border border-white/10 grid place-items-center shadow-xl">
                    <svg class="w-16 h-16 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                }
              >
                <img
                  src={u()!.picture!}
                  alt="Profilbild"
                  class="w-32 h-32 rounded-2xl object-cover border border-white/10 shadow-xl"
                />
              </Show>

              <label class="absolute -bottom-2 -right-2 p-2 bg-sky-500 hover:bg-sky-600 rounded-full cursor-pointer shadow-lg transition-colors focus-within:ring-2 focus-within:ring-sky-400/70">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <input
                  type="file"
                  accept="image/*"
                  onChange={props.onFileUpload}
                  disabled={props.uploading()}
                  class="hidden"
                />
              </label>
            </div>

            <Show when={u()?.picture}>
              <button
                type="button"
                onClick={props.onDelete}
                disabled={props.uploading()}
                class="mt-3 w-full sm:w-auto px-3 py-1.5 bg-red-500/90 hover:bg-red-600 disabled:bg-gray-500/60 text-white text-sm rounded-lg transition-colors"
              >
                Bild löschen
              </button>
            </Show>
          </div>

          {/* Name/email + trustlevel */}
          <div class="flex-1 min-w-0 text-center sm:text-left">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0">
                <h1 class="text-3xl sm:text-4xl font-bold text-white tracking-tight truncate">
                  {u()?.name} {u()?.surname}
                </h1>
                <p class="mt-1 text-sm text-white/70 truncate">{u()?.email}</p>
              </div>

              <Show when={u()}>
                <div class="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-white/90 self-center sm:self-start">
                  <svg class="h-5 w-5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span class="font-semibold">Trustlevel {u()!.trustlevel}</span>
                </div>
              </Show>
            </div>

            <div class="mt-6">{props.children}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
