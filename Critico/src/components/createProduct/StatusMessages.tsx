import { Show, Accessor } from "solid-js";

interface StatusMessagesProps {
  error: Accessor<string>;
  success: Accessor<string>;
}

export default function StatusMessages(props: StatusMessagesProps) {
  return (
    <>
      <Show when={props.error()}>
        <div
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          class="p-4 sm:p-5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl"
        >
          <div class="flex items-start gap-2.5">
            <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>

            <p class="text-sm sm:text-base text-red-700 dark:text-red-300 break-words">
              {props.error()}
            </p>
          </div>
        </div>
      </Show>

      <Show when={props.success()}>
        <div
          role="alert"
          aria-live="polite"
          aria-atomic="true"
          class="p-4 sm:p-5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl"
        >
          <div class="flex items-start gap-2.5">
            <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>

            <p class="text-sm sm:text-base text-green-700 dark:text-green-300 break-words">
              {props.success()}
            </p>
          </div>
        </div>
      </Show>
    </>
  );
}
