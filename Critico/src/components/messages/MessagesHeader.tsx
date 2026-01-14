import { A, useNavigate } from "@solidjs/router";

export function MessagesHeader() {
  const navigate = useNavigate();

  return (
    <header class="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-md">
      <div class="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <A href="/home" class="text-2xl font-bold text-sky-600 dark:text-sky-400">
          Critico
        </A>
        <div class="flex-1" />
        <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
          Nachrichten
        </h1>
      </div>
    </header>
  );
}
