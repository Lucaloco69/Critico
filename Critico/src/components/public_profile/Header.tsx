import type { ParentProps } from "solid-js";
import { Show } from "solid-js";
import type { UserProfileComputed } from "../../routes/PublicProfile";

type Props = ParentProps<{
  user: UserProfileComputed;
}>;

export default function Header(props: Props) {
  const u = () => props.user;

  return (
    <section class="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
      {/* Dezentere Top-Area */}
      <div class="relative h-24 bg-gradient-to-r from-sky-600 via-blue-700 to-indigo-700">
        <div class="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.9),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.55),transparent_45%)]" />
      </div>

      {/* KEIN negatives margin mehr -> kein Überlappen */}
      <div class="px-6 sm:px-8 py-8">
        <div class="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6">
          <Show
            when={u().picture}
            fallback={
              <div class="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-slate-800 border border-white/10 grid place-items-center shadow-xl">
                <svg class="h-9 w-9 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              src={u().picture!}
              alt="Profilbild"
              class="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover border border-white/10 shadow-xl"
            />
          </Show>

          <div class="flex-1 min-w-0">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0">
                <h1 class="text-3xl sm:text-4xl font-bold text-white tracking-tight truncate">
                  {u().name} {u().surname}
                </h1>
                <p class="mt-1 text-sm text-white/70 truncate">{u().email}</p>

                <div class="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/80">
                  <span class="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1">
                    <svg class="h-4 w-4 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {u().reviewCount} Bewertungen
                  </span>
                </div>
              </div>

              {/* Trustlevel nur 1x */}
              <div class="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-white/90 self-start">
                <svg class="h-5 w-5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span class="font-semibold">Trustlevel {u().trustlevel}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-8">{props.children}</div>
      </div>
    </section>
  );
}
