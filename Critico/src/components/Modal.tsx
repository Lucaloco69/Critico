import { Show } from "solid-js";
import type { ModalState } from "../hooks/useProductDetail";
import { t } from "../lib/i18n";

interface ModalProps {
  modal: () => ModalState;
  onClose: () => void;
  onAction: () => void;
}

function ModalIcon(props: { type: ModalState["type"] }) {
  switch (props.type) {
    case "error":
      return (
        <div class="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
          <svg class="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
    case "success":
      return (
        <div class="flex-shrink-0 w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <svg class="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    case "warning":
      return (
        <div class="flex-shrink-0 w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
          <svg class="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
      );
    default:
      return (
        <div class="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
          <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
  }
}

export default function Modal(props: ModalProps) {
  return (
    <Show when={props.modal().show}>
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={props.onClose}>
        <div
          class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md mx-4 transform transition-all duration-200 scale-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div class="flex items-start gap-4">
            <ModalIcon type={props.modal().type} />

            <div class="flex-1">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">{props.modal().title}</h3>
              <p class="text-gray-600 dark:text-gray-300 mb-4">{props.modal().message}</p>

              <div class="flex gap-3">
                <Show when={props.modal().action}>
                  <button
                    onClick={props.onAction}
                    class="flex-1 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-semibold transition-colors"
                  >
                    {props.modal().actionLabel || "OK"}
                  </button>

                  <button
                    onClick={props.onClose}
                    class="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-semibold transition-colors"
                  >
                    Abbrechen
                  </button>
                </Show>

                <Show when={!props.modal().action}>
                  <button
                    onClick={props.onClose}
                    class="w-full px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-semibold transition-colors"
                  >
                    {t("modal.understood")}
                  </button>
                </Show>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
}
