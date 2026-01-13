import { createSignal, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import StarRating from "./StarRating";
import type { Comment, Product } from "../types/product";

interface CommentSectionProps {
  comments: Comment[];
  isLoggedIn: boolean;
  canComment: boolean;
  checkingPermission: boolean;
  onSubmitComment: (content: string, stars: number) => Promise<void>;
}

export default function CommentSection(props: CommentSectionProps) {
  const navigate = useNavigate();
  const [newComment, setNewComment] = createSignal("");
  const [newCommentStars, setNewCommentStars] = createSignal<number>(0);
  const [submitting, setSubmitting] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!newComment().trim()) return;

    setSubmitting(true);
    try {
      await props.onSubmitComment(newComment(), newCommentStars());
      setNewComment("");
      setNewCommentStars(0);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div id="comment-section" class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
      <h2 class="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
        <svg class="w-7 h-7 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        Bewertungen & Kommentare ({props.comments.length})
      </h2>

      {/* Kommentar-Formular */}
      <Show 
        when={!props.checkingPermission}
        fallback={
          <div class="flex justify-center py-4 mb-6">
            <div class="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        }
      >
        <Show 
          when={props.canComment}
          fallback={
            <div class="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div class="flex items-start gap-3">
                <svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p class="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                    Keine Bewertungsberechtigung
                  </p>
                  <p class="text-sm text-yellow-700 dark:text-yellow-400">
                    Nur verifizierte Käufer können Bewertungen abgeben.
                  </p>
                </div>
              </div>
            </div>
          }
        >
          <form onSubmit={handleSubmit} class="mb-8 space-y-4">
            <div class="mb-4">
              <label class="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                Deine Bewertung (optional)
              </label>
              <div class="flex gap-2">
                <For each={[1, 2, 3, 4, 5]}>
                  {(star) => (
                    <button
                      type="button"
                      onClick={() => setNewCommentStars(star === newCommentStars() ? 0 : star)}
                      class="transition-transform hover:scale-110"
                    >
                      <svg 
                        class={`w-8 h-8 ${star <= newCommentStars() ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  )}
                </For>
              </div>
            </div>

            <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border-2 border-gray-200 dark:border-gray-600 focus-within:border-sky-500 dark:focus-within:border-sky-400 transition-colors">
              <textarea
                value={newComment()}
                onInput={(e) => setNewComment(e.currentTarget.value)}
                placeholder="Teile deine Erfahrung mit diesem Produkt..."
                class="w-full bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none resize-none"
                rows="3"
              />
            </div>
            <div class="flex justify-end mt-3">
              <button
                type="submit"
                disabled={submitting() || !newComment().trim()}
                class="px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                {submitting() ? "Wird gesendet..." : "Bewertung absenden"}
              </button>
            </div>
          </form>
        </Show>
      </Show>

      <Show when={!props.isLoggedIn}>
        <div class="mb-8 p-6 bg-sky-50 dark:bg-sky-900/20 rounded-xl border border-sky-200 dark:border-sky-800 text-center">
          <p class="text-gray-700 dark:text-gray-300 mb-3">
            Melde dich an, um eine Bewertung zu hinterlassen
          </p>
          <button
            onClick={() => navigate("/login")}
            class="px-6 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-semibold transition-colors"
          >
            Anmelden
          </button>
        </div>
      </Show>

      {/* Kommentare Liste */}
      <div class="space-y-4">
        <Show when={props.comments.length === 0}>
          <div class="text-center py-12">
            <svg class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <p class="text-gray-500 dark:text-gray-400">
              Noch keine Bewertungen. Sei der Erste!
            </p>
          </div>
        </Show>

        <For each={props.comments}>
          {(comment) => (
            <div class="p-5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow-md flex-shrink-0">
                  {comment.User ? comment.User.name.charAt(0) : "?"}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between mb-2">
                    <div>
                      <div class="flex items-baseline gap-2 mb-1">
                        <span class="font-semibold text-gray-900 dark:text-white">
                          {comment.User
                            ? `${comment.User.name} ${comment.User.surname}`
                            : "Unbekannter Nutzer"}
                        </span>
                        <span class="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      <Show when={comment.stars !== null && comment.stars !== undefined}>
                        <div class="flex items-center gap-2 mb-2">
                          <StarRating rating={comment.stars!} maxStars={5} size="sm" />
                          <span class="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {comment.stars!.toFixed(1)}
                          </span>
                        </div>
                      </Show>
                    </div>
                  </div>
                  <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {comment.content}
                  </p>
                </div>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
