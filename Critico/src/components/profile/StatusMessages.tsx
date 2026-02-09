import { Show, Accessor } from "solid-js";

interface StatusMessagesProps {
  error: Accessor<string>;
  success: Accessor<string>;
  uploading: Accessor<boolean>;
}

export default function StatusMessages(props: StatusMessagesProps) {
  return (
    <>
      <Show when={props.error()}>
        <div class="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p class="text-sm text-red-200">{props.error()}</p>
        </div>
      </Show>

      <Show when={props.success()}>
        <div class="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p class="text-sm text-green-200">{props.success()}</p>
        </div>
      </Show>

      <Show when={props.uploading()}>
        <div class="mb-4 p-3 bg-sky-500/10 border border-sky-500/30 rounded-lg">
          <div class="text-sm text-sky-200 flex items-center gap-2">
            <div class="w-4 h-4 border-2 border-sky-200 border-t-transparent rounded-full animate-spin"></div>
            Wird hochgeladen...
          </div>
        </div>
      </Show>
    </>
  );
}
