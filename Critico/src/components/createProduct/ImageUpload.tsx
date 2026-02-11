import { For, Show, Accessor } from "solid-js";
import { t } from "../../lib/i18n";

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
  const currentUrl = () => props.previewUrls()[props.currentImageIndex()];
  const currentN = () => props.currentImageIndex() + 1;

  return (
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {t("createProductImageUpload.label")}
      </label>

      <Show
        when={props.previewUrls().length > 0}
        fallback={
          <label
            class="flex flex-col items-center justify-center w-full
                   h-56 sm:h-64 md:h-72 lg:h-80
                   border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-2xl
                   cursor-pointer bg-gray-50/80 dark:bg-gray-900/30
                   hover:bg-gray-100 dark:hover:bg-gray-900/45 transition-colors"
          >
            <div class="flex flex-col items-center justify-center px-6 py-8 text-center">
              <svg class="w-12 h-12 sm:w-14 sm:h-14 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>

              <p class="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                <span class="font-semibold">{t("createProductImageUpload.dropzoneClick")}</span>{" "}
                {t("createProductImageUpload.dropzoneLine").replace(t("createProductImageUpload.dropzoneClick"), "").trim()}
              </p>

              <p class="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {t("createProductImageUpload.dropzoneHint")}
              </p>
            </div>

            <input type="file" accept="image/*" multiple onChange={props.onFileSelect} class="hidden" />
          </label>
        }
      >
        <div class="space-y-4">
          <div
            class="relative w-full
                   h-56 sm:h-64 md:h-72 lg:h-80
                   bg-gray-100 dark:bg-gray-950/40
                   rounded-2xl overflow-hidden border border-black/5 dark:border-white/10"
          >
            <img
              src={currentUrl()}
              alt={t("createProductImageUpload.previewAlt", { n: currentN() })}
              class="w-full h-full object-contain"
            />

            <button
              type="button"
              onClick={() => props.onRemoveImage(props.currentImageIndex())}
              class="absolute top-3 right-3 p-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors shadow-lg z-10"
              aria-label={t("createProductImageUpload.removeImageAria")}
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>

            <Show when={props.previewUrls().length > 1}>
              <button
                type="button"
                onClick={props.onPrevImage}
                disabled={props.currentImageIndex() === 0}
                class="absolute left-3 top-1/2 -translate-y-1/2
                       p-2.5 sm:p-3
                       bg-black/45 hover:bg-black/65 text-white rounded-full
                       transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label={t("createProductImageUpload.prevImageAria")}
              >
                <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <button
                type="button"
                onClick={props.onNextImage}
                disabled={props.currentImageIndex() === props.previewUrls().length - 1}
                class="absolute right-3 top-1/2 -translate-y-1/2
                       p-2.5 sm:p-3
                       bg-black/45 hover:bg-black/65 text-white rounded-full
                       transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label={t("createProductImageUpload.nextImageAria")}
              >
                <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </Show>

            <div class="absolute bottom-3 right-3 px-3 py-1 bg-black/60 text-white text-xs sm:text-sm rounded-full">
              {props.currentImageIndex() + 1} / {props.previewUrls().length}
            </div>
          </div>

          <div class="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
            <For each={props.previewUrls()}>
              {(url, index) => (
                <button
                  type="button"
                  onClick={() => props.setCurrentImageIndex(index())}
                  class={`snap-start flex-shrink-0
                          w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20
                          rounded-xl overflow-hidden border-2 transition-all
                          ${
                            props.currentImageIndex() === index()
                              ? "border-sky-500 ring-2 ring-sky-300/60"
                              : "border-gray-300 dark:border-gray-600 hover:border-sky-400"
                          }`}
                  aria-label={t("createProductImageUpload.selectImageAria", { n: index() + 1 })}
                >
                  <img
                    src={url}
                    alt={t("createProductImageUpload.thumbnailAlt", { n: index() + 1 })}
                    class="w-full h-full object-cover"
                  />
                </button>
              )}
            </For>

            <Show when={props.previewUrls().length < 10}>
              <label
                class="snap-start flex-shrink-0
                       w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20
                       border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl
                       flex items-center justify-center cursor-pointer
                       hover:border-sky-400 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors"
                aria-label={t("createProductImageUpload.addMoreImagesAria")}
              >
                <svg class="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                <input type="file" accept="image/*" multiple onChange={props.onFileSelect} class="hidden" />
              </label>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
}
