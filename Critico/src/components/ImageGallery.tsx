import { createSignal, For, Show } from "solid-js";

interface ImageGalleryProps {
  images: string[];
  productName: string;
}

export default function ImageGallery(props: ImageGalleryProps) {
  const [currentImageIndex, setCurrentImageIndex] = createSignal(0);

  // ✅ Loop nach vorne (mit Wrap-around)
  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev < props.images.length - 1 ? prev + 1 : 0  // ✅ Zurück zu 0 wenn am Ende
    );
  };

  // ✅ Loop nach hinten (mit Wrap-around)
  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev > 0 ? prev - 1 : props.images.length - 1  // ✅ Zum letzten Bild wenn am Anfang
    );
  };

  return (
    <Show
      when={props.images.length > 0}
      fallback={
        <div class="aspect-square flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-xl">
          <svg class="w-32 h-32 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      }
    >
      {/* Hauptbild */}
      <div class="relative aspect-square bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
        <img
          src={props.images[currentImageIndex()]}
          alt={`${props.productName} - Bild ${currentImageIndex() + 1}`}
          class="w-full h-full object-contain"
        />

        {/* Navigation Pfeile - KEINE disabled mehr! */}
        <Show when={props.images.length > 1}>
          <button
            onClick={prevImage}
            class="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all z-10 shadow-lg"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={nextImage}
            class="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all z-10 shadow-lg"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div class="absolute bottom-3 right-3 px-3 py-1 bg-black/60 text-white text-sm rounded-full shadow-lg">
            {currentImageIndex() + 1} / {props.images.length}
          </div>
        </Show>
      </div>

      {/* Thumbnail-Leiste */}
      <Show when={props.images.length > 1}>
        <div class="flex gap-3 overflow-x-auto py-3 pl-1">
          <For each={props.images}>
            {(url, index) => (
              <button
                onClick={() => setCurrentImageIndex(index())}
                class={`flex-shrink-0 transition-all ${
                  currentImageIndex() === index()
                    ? "scale-105"
                    : "scale-100 opacity-60 hover:opacity-100"
                }`}
              >
                <div class={`w-20 h-20 rounded-md overflow-hidden ${
                  currentImageIndex() === index()
                    ? "ring-3 ring-sky-500 shadow-lg"
                    : "ring-2 ring-gray-300 dark:ring-gray-600 hover:ring-sky-400"
                }`}>
                  <img
                    src={url}
                    alt={`Thumbnail ${index() + 1}`}
                    class="w-full h-full object-cover"
                  />
                </div>
              </button>
            )}
          </For>
        </div>
      </Show>
    </Show>
  );
}
