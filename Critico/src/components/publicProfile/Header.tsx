import type { ParentProps } from "solid-js";
import { Show } from "solid-js";
import type { UserProfileComputed } from "../../routes/publicProfile";

type Props = ParentProps<{
  user: UserProfileComputed;
}>;

export default function Header(props: Props) {
  const u = () => props.user;

  return (
    <section class="relative overflow-hidden rounded-3xl bg-white dark:bg-gray-800 shadow-md">
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
            <div class="min-w-0">
              <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight truncate">
                {u().name} {u().surname}
              </h1>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-400 truncate">{u().email}</p>
            </div>
          </div>
        </div>

        <div class="mt-8">{props.children}</div>
      </div>
    </section>
  );
}
