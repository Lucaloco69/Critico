import { A } from "@solidjs/router";
import { Show, createEffect } from "solid-js";
import { isLoggedIn } from "../../lib/sessionStore";
import { badgeStore } from "../../lib/badgeStore";
import { locale, setLocale, t } from "../../lib/i18n";

interface HeaderActionsProps {
  onCreateProduct: () => void;
}

export function HeaderActions(props: HeaderActionsProps) {
  createEffect(() => {
    const count = badgeStore.directMessageCount();
  });

  return (
    <div class="flex items-center gap-3">
      {/* Messages & Requests */}
      <A
        href="/messages"
        class="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        title={t("headerActions.messagesTitle")}
        aria-label={t("headerActions.messagesTitle")}
      >
        <svg class="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>

        <Show when={badgeStore.directMessageCount() > 0}>
          <span class="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
            {badgeStore.directMessageCount()}
          </span>
        </Show>
      </A>

      {/* Sprache */}
      <button
        class="p-2 w-20 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300 flex items-center justify-center gap-2"
        onClick={() => setLocale(locale() === "de" ? "en" : "de")}
        title={t("headerActions.languageTitle")}
        aria-label={t("headerActions.languageTitle")}
      >
        {locale() === "de" ? (
          <svg class="w-5 h-5" viewBox="0 0 5 3" xmlns="http://www.w3.org/2000/svg">
            <rect width="5" height="3" fill="#000" />
            <rect width="5" height="2" y="1" fill="#D00" />
            <rect width="5" height="1" y="2" fill="#FFCE00" />
          </svg>
        ) : (
          <svg class="w-5 h-5" viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg">
            <clipPath id="t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" /></clipPath>
            <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
            <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6" />
            <path d="M0,0 L60,30 M60,0 L0,30" clip-path="url(#t)" stroke="#C8102E" stroke-width="4" />
            <path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10" />
            <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" stroke-width="6" />
          </svg>
        )}
        <span class="text-sm font-medium">{locale().toUpperCase()}</span>
      </button>

      {/* Profil */}
      <A
        href={isLoggedIn() ? "/profile" : "/login"}
        class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        title={t("headerActions.profileTitle")}
        aria-label={t("headerActions.profileTitle")}
      >
        <svg class="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </A>

      {/* Artikel einstellen */}
      <button
        onClick={props.onCreateProduct}
        class="px-4 py-2 min-w-[160px] bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105 flex justify-center items-center"
        type="button"
      >
        {t("headerActions.createProduct")}
      </button>
    </div>
  );
}
