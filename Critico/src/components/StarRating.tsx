import { For } from "solid-js";

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: "sm" | "md" | "lg";
}

export default function StarRating(props: StarRatingProps) {
  const maxStars = () => props.maxStars || 5;
  const sizeClass = () => {
    switch (props.size || "md") {
      case "sm": return "w-4 h-4";
      case "lg": return "w-6 h-6";
      default: return "w-5 h-5";
    }
  };

  const gradientId = `starGradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div class="flex items-center gap-1">
      <svg style="width: 0; height: 0; position: absolute;">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#fbbf24;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#f59e0b;stop-opacity:1" />
          </linearGradient>
        </defs>
      </svg>

      <For each={Array.from({ length: maxStars() })}>
        {(_, index) => {
          const starIndex = index();
          const diff = props.rating - starIndex;
          
          let filling: number;
          if (diff >= 1) {
            filling = 1;
          } else if (diff >= 0.75) {
            filling = 1;
          } else if (diff >= 0.25) {
            filling = 0.5;
          } else {
            filling = 0;
          }

          return (
            <div class={`relative ${sizeClass()}`}>
              <svg 
                class="absolute w-full h-full text-gray-200 dark:text-gray-700 drop-shadow-sm" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>

              <div 
                class="absolute overflow-hidden top-0 left-0 h-full transition-all duration-200" 
                style={`width: ${filling * 100}%`}
              >
                <svg 
                  class={`${sizeClass()} drop-shadow-md`}
                  fill={`url(#${gradientId})`}
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            </div>
          );
        }}
      </For>
    </div>
  );
}
