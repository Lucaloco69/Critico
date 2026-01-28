/**
 * SearchBar
 * ---------
 * Suchleiste für die Produktübersicht.
 *
 * - Kontrolliertes Input-Feld: liest den aktuellen Suchtext über searchQuery() und aktualisiert ihn
 *   über setSearchQuery(...) bei jeder Eingabe.
 * - Dient zum Filtern der Produktliste im Parent; diese Komponente enthält nur die UI (inkl. Such-Icon).
 */

import { Accessor, Setter } from "solid-js";

interface SearchBarProps {
  searchQuery: Accessor<string>;
  setSearchQuery: Setter<string>;
}

export function SearchBar(props: SearchBarProps) {
  return (
    <div class="flex-1 max-w-xl">
      <div class="relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Produkte durchsuchen..."
          value={props.searchQuery()}
          onInput={(e) => props.setSearchQuery(e.currentTarget.value)}
          class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-gray-700 dark:text-white"
        />
      </div>
    </div>
  );
}
