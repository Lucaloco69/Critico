import { createSignal, createEffect, For, Show } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { supabase } from "../lib/supabaseClient";
import sessionStore, { isLoggedIn } from "../lib/sessionStore";

interface Tag {
  id: number;
  name: string;
}

export default function CreateProduct() {
  const navigate = useNavigate();

  const [name, setName] = createSignal("");
  const [beschreibung, setBeschreibung] = createSignal("");
  const [selectedFile, setSelectedFile] = createSignal<File | null>(null);
  const [previewUrl, setPreviewUrl] = createSignal<string | null>(null);
  const [availableTags, setAvailableTags] = createSignal<Tag[]>([]);
  const [selectedTags, setSelectedTags] = createSignal<number[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [uploading, setUploading] = createSignal(false);
  const [error, setError] = createSignal("");
  const [success, setSuccess] = createSignal("");

  // Prüfe Login
  createEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login", { replace: true });
    }
  });

  // Lade alle verfügbaren Tags
  createEffect(async () => {
    try {
      const { data, error } = await supabase
        .from("Tags")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setAvailableTags(data || []);
    } catch (err) {
      console.error("Fehler beim Laden der Tags:", err);
    }
  });

  // Datei-Auswahl + Preview
  const handleFileSelect = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    // Preview erstellen
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // TagToggleklickhändlr
  const toggleTag = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  // Produkt erstellen
  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (!sessionStore.user) throw new Error("Nicht eingeloggt");

      // 1. User-ID aus DB holen (via auth_id)
      const { data: userData, error: userError } = await supabase
        .from("User")
        .select("id")
        .eq("auth_id", sessionStore.user.id)
        .single();

      if (userError) throw userError;
      const userId = userData.id;

      let pictureUrl: string | null = null;

      // 2. Bild hochladen (falls vorhanden)
      if (selectedFile()) {
        setUploading(true);
        const file = selectedFile()!;
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${sessionStore.user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("product_pictures")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("product_pictures").getPublicUrl(filePath);

        pictureUrl = publicUrl;
        setUploading(false);
      }

      // 3. Produkt in DB erstellen
      const { data: productData, error: productError } = await supabase
        .from("Product")
        .insert({
          name: name(),
          beschreibung: beschreibung(),
          picture: pictureUrl,
          owner_id: userId,
        })
        .select()
        .single();

      if (productError) throw productError;

      // 4. Tags verknüpfen (Product_Tags Junction Table)
      if (selectedTags().length > 0) {
        const tagInserts = selectedTags().map((tagId) => ({
          product_id: productData.id,
          tags_id: tagId,
        }));

        const { error: tagError } = await supabase
          .from("Product_Tags")
          .insert(tagInserts);

        if (tagError) throw tagError;
      }

      setSuccess("Produkt erfolgreich erstellt!");
      
      setTimeout(() => {
        navigate("/home", { replace: true });
      }, 1500);
    } catch (err: any) {
      console.error("Fehler:", err);
      setError(err.message || "Produkt konnte nicht erstellt werden");
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header class="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-md">
        <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <A
            href="/home"
            class="text-2xl font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 transition-colors"
          >
            Critico
          </A>

          <A
            href="/home"
            class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Abbrechen
          </A>
        </div>
      </header>

      {/* Main Content */}
      <main class="max-w-4xl mx-auto px-4 py-8">
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Artikel verkaufen
          </h1>

          <form onSubmit={handleSubmit} class="space-y-6">
            {/* Bild Upload */}
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fotos hinzufügen
              </label>

              <Show
                when={previewUrl()}
                fallback={
                  <label class="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-xl cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                    <div class="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg
                        class="w-16 h-16 mb-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      <p class="mb-2 text-sm text-gray-500 dark:text-gray-400">
                        <span class="font-semibold">Klicken zum Hochladen</span>{" "}
                        oder Drag & Drop
                      </p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        PNG, JPG oder JPEG (max. 10MB)
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      class="hidden"
                    />
                  </label>
                }
              >
                <div class="relative">
                  <img
                    src={previewUrl()!}
                    alt="Preview"
                    class="w-full h-64 object-cover rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewUrl(null);
                      setSelectedFile(null);
                    }}
                    class="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                  >
                    <svg
                      class="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </Show>
            </div>

            {/* Titel */}
            <div>
              <label
                for="name"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Titel
              </label>
              <input
                id="name"
                type="text"
                value={name()}
                onInput={(e) => setName(e.currentTarget.value)}
                placeholder="z.B. iPhone 13 Pro"
                required
                class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Beschreibung */}
            <div>
              <label
                for="beschreibung"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Beschreibe deinen Artikel
              </label>
              <textarea
                id="beschreibung"
                value={beschreibung()}
                onInput={(e) => setBeschreibung(e.currentTarget.value)}
                placeholder="z.B. Kaum benutzt, wie neu, mit Originalverpackung..."
                rows="6"
                required
                class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
              />
            </div>

            {/* Tags */}
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Tags auswählen (optional)
              </label>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <For each={availableTags()}>
                  {(tag) => (
                    <label class="flex items-center gap-2 cursor-pointer hover:bg-white dark:hover:bg-gray-700 p-2 rounded-lg transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedTags().includes(tag.id)}
                        onChange={() => toggleTag(tag.id)}
                        class="w-4 h-4 text-sky-600 rounded focus:ring-2 focus:ring-sky-500"
                      />
                      <span class="text-sm text-gray-700 dark:text-gray-300">
                        {tag.name}
                      </span>
                    </label>
                  )}
                </For>
              </div>
              <Show when={selectedTags().length > 0}>
                <div class="mt-3 flex flex-wrap gap-2">
                  <For each={selectedTags()}>
                    {(tagId) => {
                      const tag = availableTags().find((t) => t.id === tagId);
                      return (
                        <span class="px-3 py-1 bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 text-sm rounded-full flex items-center gap-2">
                          {tag?.name}
                          <button
                            type="button"
                            onClick={() => toggleTag(tagId)}
                            class="hover:text-sky-900 dark:hover:text-sky-100"
                          >
                            ×
                          </button>
                        </span>
                      );
                    }}
                  </For>
                </div>
              </Show>
            </div>

            {/* Error/Success Messages */}
            <Show when={error()}>
              <div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <p class="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                  <svg
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {error()}
                </p>
              </div>
            </Show>

            <Show when={success()}>
              <div class="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                <p class="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                  <svg
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {success()}
                </p>
              </div>
            </Show>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading() || uploading()}
              class="w-full py-4 px-6 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold text-lg disabled:cursor-not-allowed hover:scale-[1.02] disabled:hover:scale-100"
            >
              <Show
                when={!loading() && !uploading()}
                fallback={
                  <span class="flex items-center justify-center gap-2">
                    <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {uploading() ? "Bild wird hochgeladen..." : "Wird erstellt..."}
                  </span>
                }
              >
                Artikel einstellen
              </Show>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
