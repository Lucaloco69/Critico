/**
 * CreateProduct (Page)
 * -------------------
 * Seite zum Erstellen eines neuen Produkts/Artikels inkl. Multi-Image Upload und Tag-Auswahl.
 *
 * - Prüft Login-Status und leitet nicht eingeloggte Nutzer zu /login um.
 * - Lädt verfügbare Tags aus der DB (Tags Tabelle) und erlaubt Mehrfachauswahl (selectedTags).
 * - Ermöglicht das Auswählen von bis zu 10 Bildern, erzeugt lokale Previews (FileReader) und bietet
 *   eine Galerie-Ansicht mit Navigation sowie Entfernen einzelner Bilder vor dem Upload.
 * - Beim Submit:
 *   1) Ermittelt die interne User-ID (User.id) über auth_id,
 *   2) lädt alle ausgewählten Bilder in Supabase Storage hoch und sammelt deren publicUrls,
 *   3) erstellt den Product-Datensatz (name, beschreibung, price, owner_id),
 *   4) speichert alle Bild-URLs in product_images mit order_index,
 *   5) verknüpft ausgewählte Tags über Product_Tags.
 * - Zeigt Lade-/Upload-States sowie Error-/Success-Meldungen und navigiert nach Erfolg zurück zur Startseite.
 */

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
  const [price, setPrice] = createSignal("");
  
  // 🆕 Mehrere Bilder
  const [selectedFiles, setSelectedFiles] = createSignal<File[]>([]);
  const [previewUrls, setPreviewUrls] = createSignal<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = createSignal(0);
  
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

  // 🆕 Mehrere Dateien auswählen
  const handleFileSelect = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const files = Array.from(target.files || []);
    if (files.length === 0) return;

    const newFiles = [...selectedFiles(), ...files].slice(0, 10); // Max 10 Bilder
    setSelectedFiles(newFiles);

    // Previews erstellen
    const newPreviews: string[] = [];
    let loaded = 0;

    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string);
        loaded++;
        if (loaded === newFiles.length) {
          setPreviewUrls(newPreviews);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // 🆕 Einzelnes Bild entfernen
  const removeImage = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    
    if (currentImageIndex() >= previewUrls().length - 1) {
      setCurrentImageIndex(Math.max(0, previewUrls().length - 2));
    }
  };

  // 🆕 Navigation
  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev < previewUrls().length - 1 ? prev + 1 : prev
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  // Tag Toggle
  const toggleTag = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  // 🆕 Produkt erstellen mit mehreren Bildern
  // Nur den handleSubmit Teil ändern (Zeile ~180-220):

const handleSubmit = async (e: Event) => {
  e.preventDefault();
  setLoading(true);
  setError("");
  setSuccess("");

  try {
    if (!sessionStore.user) throw new Error("Nicht eingeloggt");

    // 1. User-ID aus DB holen
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("id")
      .eq("auth_id", sessionStore.user.id)
      .maybeSingle();

    if (userError) throw userError;

    if (!userData) throw new Error("Benutzer nicht gefunden");
    const userId = userData.id;

    const pictureUrls: string[] = [];

    // 2. Alle Bilder hochladen
    if (selectedFiles().length > 0) {
      setUploading(true);
      
      for (const file of selectedFiles()) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `${sessionStore.user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("product_pictures")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("product_pictures").getPublicUrl(filePath);

        pictureUrls.push(publicUrl);
      }
      
      setUploading(false);
    }

    // 3. ✅ Produkt in DB erstellen OHNE picture
    const { data: productData, error: productError } = await supabase
      .from("Product")
      .insert({
        name: name(),
        beschreibung: beschreibung(),
        price: price() ? parseFloat(price()) : null,
        owner_id: userId,
      })
      .select()
      .single();

    if (productError) throw productError;

    // 4. ✅ ALLE Bilder in Product_Images speichern (inkl. erstes Bild)
    if (pictureUrls.length > 0) {
      const imageInserts = pictureUrls.map((url, index) => ({
        product_id: productData.id,
        image_url: url,
        order_index: index, // Erstes Bild = 0, zweites = 1, etc.
      }));

      const { error: imagesError } = await supabase
        .from("product_images")
        .insert(imageInserts);

      if (imagesError) {
        console.error("Fehler beim Speichern der Bilder:", imagesError);
        throw imagesError;
      }
    }

    // 5. Tags verknüpfen
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
            Artikel einstellen
          </h1>

          <form onSubmit={handleSubmit} class="space-y-6">
            {/* 🆕 Bilder Upload mit Swipe */}
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fotos hinzufügen (max. 10)
              </label>

              <Show
                when={previewUrls().length > 0}
                fallback={
                  <label class="flex flex-col items-center justify-center w-full h-80 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-xl cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
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
                        <span class="font-semibold">Klicken zum Hochladen</span> oder Drag & Drop
                      </p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        PNG, JPG oder JPEG (max. 10MB pro Bild)
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      class="hidden"
                    />
                  </label>
                }
              >
                <div class="space-y-4">
                  {/* Haupt-Bild-Anzeige mit Navigation */}
                  <div class="relative w-full h-80 bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden">
                    <img
                      src={previewUrls()[currentImageIndex()]}
                      alt={`Preview ${currentImageIndex() + 1}`}
                      class="w-full h-full object-contain"
                    />

                    {/* Bild löschen */}
                    <button
                      type="button"
                      onClick={() => removeImage(currentImageIndex())}
                      class="absolute top-3 right-3 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-lg z-10"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>

                    {/* Navigation Pfeile */}
                    <Show when={previewUrls().length > 1}>
                      <button
                        type="button"
                        onClick={prevImage}
                        disabled={currentImageIndex() === 0}
                        class="absolute left-3 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={nextImage}
                        disabled={currentImageIndex() === previewUrls().length - 1}
                        class="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </Show>

                    {/* Bild-Zähler */}
                    <div class="absolute bottom-3 right-3 px-3 py-1 bg-black/60 text-white text-sm rounded-full">
                      {currentImageIndex() + 1} / {previewUrls().length}
                    </div>
                  </div>

                  {/* Thumbnail-Leiste */}
                  <div class="flex gap-2 overflow-x-auto pb-2">
                    <For each={previewUrls()}>
                      {(url, index) => (
                        <button
                          type="button"
                          onClick={() => setCurrentImageIndex(index())}
                          class={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                            currentImageIndex() === index()
                              ? "border-sky-500 ring-2 ring-sky-300"
                              : "border-gray-300 dark:border-gray-600 hover:border-sky-400"
                          }`}
                        >
                          <img
                            src={url}
                            alt={`Thumbnail ${index() + 1}`}
                            class="w-full h-full object-cover"
                          />
                        </button>
                      )}
                    </For>

                    {/* Mehr Bilder hinzufügen */}
                    <Show when={previewUrls().length < 10}>
                      <label class="flex-shrink-0 w-20 h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-sky-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleFileSelect}
                          class="hidden"
                        />
                      </label>
                    </Show>
                  </div>
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
                placeholder="z.B. SmartGrow Mini - Intelligenter Indoor-Kräutergarten"
                required
                class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Preis */}
            <div>
              <label
                for="price"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Preis
              </label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-semibold">
                  €
                </span>
                <input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price()}
                  onInput={(e) => setPrice(e.currentTarget.value)}
                  placeholder="0.00"
                  class="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
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
                placeholder="z.B. Das System überwacht selbstständig Wasserbedarf..."
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
                    {uploading() ? "Bilder werden hochgeladen..." : "Wird erstellt..."}
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
