import { Show, Accessor } from "solid-js";
import { UserProfileComputed } from "../../hooks/profile/useProfile";

interface ProfilePictureProps {
  user: Accessor<UserProfileComputed | null>;
  uploading: Accessor<boolean>;
  onFileUpload: (e: Event) => void;
  onDelete: () => void;
}

export default function ProfilePicture(props: ProfilePictureProps) {
  return (
    <div class="relative -mt-16 mb-6">
      <div class="relative inline-block">
        <Show
          when={props.user()?.picture}
          fallback={
            <div class="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center border-4 border-white/10">
              <svg class="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
          }
        >
          <img
            src={props.user()!.picture!}
            alt="Profilbild"
            class="w-32 h-32 rounded-full object-cover border-4 border-white/10 shadow-lg"
          />
        </Show>

        <label class="absolute bottom-0 right-0 p-2 bg-sky-500 hover:bg-sky-600 rounded-full cursor-pointer shadow-lg transition-colors">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <input type="file" accept="image/*" onChange={props.onFileUpload} disabled={props.uploading()} class="hidden" />
        </label>
      </div>

      <Show when={props.user()?.picture}>
        <button
          onClick={props.onDelete}
          disabled={props.uploading()}
          class="ml-4 px-3 py-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-500 text-white text-sm rounded-lg transition-colors"
        >
          Bild löschen
        </button>
      </Show>
    </div>
  );
}
