/**
 * HeaderActions
 * -------------
 * Rendert die Aktions-Buttons im App-Header (Navigation + Call-to-Action).
 *
 * - Nachrichten-Button (/messages) inkl. Badge für ungelesene Direktnachrichten (directMessageCount aus badgeStore).
 * - Platzhalter-Button für "Gespeichert" (Bookmark-Icon, aktuell ohne Logik).
 * - Profil-Button: navigiert je nach Login-Status (isLoggedIn) zu /profile oder /login.
 * - "Artikel einstellen"-Button: triggert props.onCreateProduct (z.B. Öffnen eines Create-Product Modals).
 */

import { A } from "@solidjs/router";
import { Show } from "solid-js";
import { isLoggedIn } from "../lib/sessionStore";
import { badgeStore } from "../lib/badgeStore";


interface HeaderActionsProps {
  onCreateProduct: () => void;
}


export function HeaderActions(props: HeaderActionsProps) {
  const { directMessageCount } = badgeStore; // ✅ Nur noch directMessageCount


  return (
    <div class="flex items-center gap-3">
      {/* Messages & Requests kombiniert */}
      <A 
        href="/messages" 
        class="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        title="Nachrichten & Anfragen"
      >
        <svg class="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <Show when={directMessageCount() > 0}>
          <span class="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
            {directMessageCount()}
          </span>
        </Show>
      </A>


      {/* Gespeichert */}
      <button class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
        <svg class="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      </button>


      {/* Profil */}
      <A href={isLoggedIn() ? "/profile" : "/login"} class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
        <svg class="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </A>


      {/* Artikel einstellen Button */}
      <button
        onClick={props.onCreateProduct}
        class="px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
      >
        Artikel einstellen
      </button>
    </div>
  );
}
