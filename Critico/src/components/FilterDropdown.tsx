import { For, Show, Accessor, Setter, onMount, onCleanup } from "solid-js";

interface Tag {
  id: number;
  name: string;
}

interface FilterDropdownProps {
  tags: Accessor<Tag[]>;
  selectedTags: Accessor<number[]>;
  setSelectedTags: Setter<number[]>;
  showDropdown: Accessor<boolean>;
  setShowDropdown: Setter<boolean>;
}

export function FilterDropdown(props: FilterDropdownProps) {
  let dropdownRef: HTMLDivElement | undefined;

  onMount(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
        props.setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    onCleanup(() => document.removeEventListener("mousedown", handleClickOutside));
  });

  const toggleTag = (tagId: number) => {
    props.setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <div class="relative w-full sm:w-auto" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => props.setShowDropdown(!props.showDropdown())}
        class="
          relative w-full sm:w-auto
          h-11 px-4
          rounded-xl
          bg-white dark:bg-gray-700/70
          border border-gray-300 dark:border-white/10
          text-gray-900 dark:text-white
          shadow-sm
          inline-flex items-center gap-2
          hover:bg-gray-100 dark:hover:bg-gray-600/70
          transition-colors
          focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-500
        "
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>

        <span class="text-base font-semibold leading-none">Filter</span>

        <Show when={props.selectedTags().length > 0}>
          <span class="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-sky-500 text-white text-xs font-bold rounded-full">
            {props.selectedTags().length}
          </span>
        </Show>
      </button>

      <Show when={props.showDropdown()}>
        <div class="absolute top-full mt-2 left-0 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 max-h-96 overflow-y-auto z-50">
          <p class="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Tags filtern</p>

          <For each={props.tags()}>
            {(tag) => (
              <label class="flex items-center gap-2 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-2">
                <input
                  type="checkbox"
                  checked={props.selectedTags().includes(tag.id)}
                  onChange={() => toggleTag(tag.id)}
                  class="w-4 h-4 rounded accent-sky-600 focus:ring-2 focus:ring-sky-500"
                />
                <span class="text-sm text-gray-700 dark:text-gray-300">{tag.name}</span>
              </label>
            )}
          </For>

          <Show when={props.selectedTags().length > 0}>
            <button
              type="button"
              onClick={() => props.setSelectedTags([])}
              class="mt-3 w-full h-10 rounded-lg text-sm text-sky-600 hover:text-sky-700 font-medium"
            >
              Filter zurücksetzen
            </button>
          </Show>
        </div>
      </Show>
    </div>
  );
}
