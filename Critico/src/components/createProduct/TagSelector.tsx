import { For, Show, Accessor } from "solid-js";

interface Tag {
  id: number;
  name: string;
}

interface TagSelectorProps {
  availableTags: Accessor<Tag[]>;
  selectedTags: Accessor<number[]>;
  onToggleTag: (tagId: number) => void;
}

export default function TagSelector(props: TagSelectorProps) {
  return (
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Tags auswählen (optional)
      </label>
      
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
        <For each={props.availableTags()}>
          {(tag) => (
            <label class="flex items-center gap-2 cursor-pointer hover:bg-white dark:hover:bg-gray-700 p-2 rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={props.selectedTags().includes(tag.id)}
                onChange={() => props.onToggleTag(tag.id)}
                class="w-4 h-4 text-sky-600 rounded focus:ring-2 focus:ring-sky-500"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300">
                {tag.name}
              </span>
            </label>
          )}
        </For>
      </div>
      
      <Show when={props.selectedTags().length > 0}>
        <div class="mt-3 flex flex-wrap gap-2">
          <For each={props.selectedTags()}>
            {(tagId) => {
              const tag = props.availableTags().find((t) => t.id === tagId);
              return (
                <span class="px-3 py-1 bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 text-sm rounded-full flex items-center gap-2">
                  {tag?.name}
                  <button
                    type="button"
                    onClick={() => props.onToggleTag(tagId)}
                    class="hover:text-sky-900 dark:hover:text-sky-100"
                  >
                    ×
                  </button>
                </span>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
}
