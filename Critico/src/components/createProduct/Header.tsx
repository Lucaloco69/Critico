import { A } from "@solidjs/router";

export default function Header() {
  return (
    <header class="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-md">
      <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <A
          href="/home"
          class="text-2xl font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 transition-colors"
        >
          Critico
        </A>

        <A
          href="/home"
          class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Abbrechen
        </A>
      </div>
    </header>
  );
}
