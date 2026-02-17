import { Show, Accessor } from "solid-js";
import { t } from "../../lib/i18n";

interface SubmitButtonProps {
  loading: Accessor<boolean>;
  uploading: Accessor<boolean>;
}

export default function SubmitButton(props: SubmitButtonProps) {
  const disabled = () => props.loading() || props.uploading();

  return (
    <button
      type="submit"
      disabled={disabled()}
      class="
        w-full py-4 px-6
        rounded-xl shadow-lg
        bg-gradient-to-r from-sky-500 to-blue-600 text-white
        font-semibold text-base sm:text-lg
        transition-all motion-reduce:transition-none
        hover:from-sky-600 hover:to-blue-700 hover:shadow-xl motion-safe:hover:scale-[1.02]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950
        disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed
        disabled:hover:shadow-lg disabled:hover:scale-100
      "
    >
      <Show
        when={!props.loading() && !props.uploading()}
        fallback={
          <span class="flex items-center justify-center gap-2">
            <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full motion-safe:animate-spin motion-reduce:animate-none" />
            {props.uploading()
              ? t("createProductSubmitButton.uploadingImages")
              : t("createProductSubmitButton.creating")}
          </span>
        }
      >
        {t("createProductSubmitButton.submit")}
      </Show>
    </button>
  );
}
