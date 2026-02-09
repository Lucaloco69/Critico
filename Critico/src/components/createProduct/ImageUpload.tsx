import { For, Show, Accessor } from "solid-js";

interface ImageUploadProps {
  previewUrls: Accessor<string[]>;
  currentImageIndex: Accessor<number>;
  setCurrentImageIndex: (index: number) => void;
  onFileSelect: (e: Event) => void;
  onRemoveImage: (index: number) => void;
  onNextImage: () => void;
  onPrevImage: () => void;
}

export default function ImageUpload(props: ImageUploadProps) {
  return (
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Fotos hinzufügen (max. 10)
      </label>

      <Show
        when={props.previewUrls().length > 0}
        fallback={
          <label class="flex flex-col items-center justify-center w-full h-80 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-xl cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
            <div class="flex flex-col items-center justify-center pt-5 pb-6">
              <svg
                class="w-16 h-16 mb-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              <p class="mb-2 text-sm text-gray-500 dark:text-gray-400">
                <span class="font-semibold">Klicken zum Hochladen</span> oder Drag & Drop
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                PNG, JPG oder JPEG (max. 10MB pro Bild)
              </p>
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={props.onFileSelect}
              class="hidden"
            />
          </label>
        }
      >
        <div class="space-y-4">
          {/* Haupt-Bild-Anzeige */}
          <div class="relative w-full h-80 bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden">
            <img
              src={props.previewUrls()[props.currentImageIndex()]}
              alt={`Preview ${props.currentImageIndex() + 1}`}
              class="w-full h-full object-contain"
            />

            {/* Bild löschen */}
            <button
              type="button"
              onClick={() => props.onRemoveImage(props.currentImageIndex())}
              class="absolute top-3 right-3 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-lg z-10"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>

            {/* Navigation Pfeile */}
            <Show when={props.previewUrls().length > 1}>
              <button
                type="button"
                onClick={props.onPrevImage}
                disabled={props.currentImageIndex() === 0}
                class="absolute left-3 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <button
                type="button"
                onClick={props.onNextImage}
                disabled={props.currentImageIndex() === props.previewUrls().length - 1}
                class="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </Show>

            {/* Bild-Zähler */}
            <div class="absolute bottom-3 right-3 px-3 py-1 bg-black/60 text-white text-sm rounded-full">
              {props.currentImageIndex() + 1} / {props.previewUrls().length}
            </div>
          </div>

          {/* Thumbnail-Leiste */}
          <div class="flex gap-2 overflow-x-auto pb-2">
            <For each={props.previewUrls()}>
              {(url, index) => (
                <button
                  type="button"
                  onClick={() => props.setCurrentImageIndex(index())}
                  class={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    props.currentImageIndex() === index()
                      ? "border-sky-500 ring-2 ring-sky-300"
                      : "border-gray-300 dark:border-gray-600 hover:border-sky-400"
                  }`}
                >
                  <img
                    src={url}
                    alt={`Thumbnail ${index() + 1}`}
                    class="w-full h-full object-cover"
                  />
                </button>
              )}
            </For>

            {/* Mehr Bilder hinzufügen */}
            <Show when={props.previewUrls().length < 10}>
              <label class="flex-shrink-0 w-20 h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-sky-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={props.onFileSelect}
                  class="hidden"
                />
              </label>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
}
