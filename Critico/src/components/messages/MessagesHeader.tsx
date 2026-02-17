import { A, useNavigate } from "@solidjs/router";
import { t } from "../../lib/i18n";
import { BackButton } from "../share/BackButton";

export function MessagesHeader() {
  const navigate = useNavigate();

  return (
    <header class="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-md">
      <div class="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
        <BackButton />

        <A href="/home" class="text-2xl font-bold text-sky-600 dark:text-sky-400">
          Critico
        </A>

        <div class="flex-1" />

        <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
          {t("messagesHeader.title")}
        </h1>
      </div>
    </header>
  );
}
