import { A } from "@solidjs/router";

export default function Header() {
  return (
    <header class="sticky top-0 z-50 border-b border-black/5 dark:border-white/10 bg-white/80 dark:bg-gray-900/70 backdrop-blur-md">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
        <A
          href="/home"
          class="text-xl sm:text-2xl font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 transition-colors"
        >
          Critico
        </A>

        <A
          href="/home"
          class="inline-flex items-center justify-center rounded-lg border border-black/10 dark:border-white/10
                 bg-white/60 dark:bg-white/5 px-3 sm:px-4 py-2 text-sm sm:text-base
                 text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-white/10 transition-colors"
        >
          Abbrechen
        </A>
      </div>
    </header>
  );
}
