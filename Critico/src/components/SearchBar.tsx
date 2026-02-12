import { Accessor, Setter } from "solid-js";
import { t } from "../lib/i18n"; // falls dein SearchBar in src/components liegt, ggf. Pfad anpassen

interface SearchBarProps {
  searchQuery: Accessor<string>;
  setSearchQuery: Setter<string>;
}

export function SearchBar(props: SearchBarProps) {
  return (
    <div class="w-full">
      <div class="relative w-full">
        <svg
          class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-white/40"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        <input
          type="text"
          placeholder={t("searchBar.placeholder")}
          value={props.searchQuery()}
          onInput={(e) => props.setSearchQuery(e.currentTarget.value)}
          class="w-full h-11 pl-12 pr-4 rounded-xl bg-white dark:bg-gray-700/70 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-500"
        />
      </div>
    </div>
  );
}
