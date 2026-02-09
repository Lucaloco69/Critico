import { Show, Accessor } from "solid-js";

interface SubmitButtonProps {
  loading: Accessor<boolean>;
  uploading: Accessor<boolean>;
}

export default function SubmitButton(props: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={props.loading() || props.uploading()}
      class="w-full py-4 px-6 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold text-lg disabled:cursor-not-allowed hover:scale-[1.02] disabled:hover:scale-100"
    >
      <Show
        when={!props.loading() && !props.uploading()}
        fallback={
          <span class="flex items-center justify-center gap-2">
            <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            {props.uploading() ? "Bilder werden hochgeladen..." : "Wird erstellt..."}
          </span>
        }
      >
        Artikel einstellen
      </Show>
    </button>
  );
}
