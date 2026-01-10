import { createSignal, createEffect, Show } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { supabase } from "../lib/supabaseClient";
import { isLoggedIn, getSession, clearSession } from "../lib/sessionStore";


interface UserProfile {
  id: number;
  name: string;
  surname: string;
  email: string;
  picture: string | null;
  exp: number;
  trustlevel: number;
}

export default function Profile() {
  const navigate = useNavigate();
  
  const [user, setUser] = createSignal<UserProfile | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [uploading, setUploading] = createSignal(false);
  const [error, setError] = createSignal("");
  const [success, setSuccess] = createSignal("");

  // Lade User-Daten
  createEffect(async () => {
    if (!isLoggedIn()) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      setLoading(true);
      const session = getSession();
      if (!session?.user) throw new Error("Keine Session");

      // Hole User aus DB via auth_id
      const { data, error: fetchError } = await supabase
        .from("User")
        .select("id, name, surname, email, picture, exp, trustlevel")
        .eq("auth_id", session.user.id)
        .single();

      if (fetchError) throw fetchError;
      setUser(data);
    } catch (err: any) {
      console.error("Fehler beim Laden:", err);
      setError("Profil konnte nicht geladen werden");
    } finally {
      setLoading(false);
    }
  });

  // Profilbild hochladen
  const handleFileUpload = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file || !user()) return;

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      // 1. Auth User holen (für auth.uid() als Folder)
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Nicht authentifiziert");

      // 2. Altes Bild löschen (optional)
      if (user()!.picture) {
        const oldPath = user()!.picture!.split('/').slice(-2).join('/'); // "uuid/filename.jpg"
        await supabase.storage
          .from('profil_pictures')
          .remove([oldPath]);
      }

      // 3. Neues Bild hochladen (Pfad: auth.uid/timestamp.ext)
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${authUser.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile_pictures')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 4. Public URL generieren
      const { data: { publicUrl } } = supabase.storage
        .from('profile_pictures')
        .getPublicUrl(filePath);

      // 5. URL in User-Tabelle speichern
      const { error: updateError } = await supabase
        .from("User")
        .update({ picture: publicUrl })
        .eq("id", user()!.id);

      if (updateError) throw updateError;

      // 6. Lokalen State aktualisieren
      setUser({ ...user()!, picture: publicUrl });
      setSuccess("Profilbild erfolgreich aktualisiert!");
    } catch (err: any) {
      console.error("Upload-Fehler:", err);
      setError(err.message || "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  };

  // Profilbild löschen
  const handleDeletePicture = async () => {
    if (!user()?.picture || !confirm("Profilbild wirklich löschen?")) return;

    setUploading(true);
    setError("");

    try {
      // 1. Bild aus Storage löschen
      const oldPath = user()!.picture!.split('/').slice(-2).join('/');
      const { error: deleteError } = await supabase.storage
        .from('profile_pictures')
        .remove([oldPath]);

      if (deleteError) throw deleteError;

      // 2. picture auf NULL setzen
      const { error: updateError } = await supabase
        .from("User")
        .update({ picture: null })
        .eq("id", user()!.id);

      if (updateError) throw updateError;

      setUser({ ...user()!, picture: null });
      setSuccess("Profilbild gelöscht");
    } catch (err: any) {
      console.error("Löschen fehlgeschlagen:", err);
      setError("Löschen fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header (gleich wie Home) */}
      <header class="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-md">
        <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <A href="/home" class="text-2xl font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 transition-colors">
            Critico
          </A>
          
          <div class="flex items-center gap-3">
            <A href="/home" class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              Zurück
            </A>
            <button
              onClick={handleLogout}
              class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors"
            >
              Abmelden
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main class="max-w-4xl mx-auto px-4 py-8">
        <Show when={loading()}>
          <div class="flex justify-center items-center py-20">
            <div class="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </Show>

        <Show when={!loading() && user()}>
          <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            {/* Header mit Gradient */}
            <div class="h-32 bg-gradient-to-r from-sky-500 to-blue-600"></div>

            {/* Profil Content */}
            <div class="px-8 pb-8">
              {/* Profilbild */}
              <div class="relative -mt-16 mb-6">
                <div class="relative inline-block">
                  <Show
                    when={user()?.picture}
                    fallback={
                      <div class="w-32 h-32 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center border-4 border-white dark:border-gray-800">
                        <svg class="w-16 h-16 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    }
                  >
                    <img
                      src={user()!.picture!}
                      alt="Profilbild"
                      class="w-32 h-32 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-lg"
                    />
                  </Show>

                  {/* Upload Button */}
                  <label class="absolute bottom-0 right-0 p-2 bg-sky-500 hover:bg-sky-600 rounded-full cursor-pointer shadow-lg transition-colors">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={uploading()}
                      class="hidden"
                    />
                  </label>
                </div>

                {/* Bild löschen Button */}
                <Show when={user()?.picture}>
                  <button
                    onClick={handleDeletePicture}
                    disabled={uploading()}
                    class="ml-4 px-3 py-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white text-sm rounded-lg transition-colors"
                  >
                    Bild löschen
                  </button>
                </Show>
              </div>

              {/* Fehler/Erfolg Messages */}
              <Show when={error()}>
                <div class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p class="text-sm text-red-700 dark:text-red-300">{error()}</p>
                </div>
              </Show>

              <Show when={success()}>
                <div class="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p class="text-sm text-green-700 dark:text-green-300">{success()}</p>
                </div>
              </Show>

              <Show when={uploading()}>
                <div class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div class="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                    <div class="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
                    Wird hochgeladen...
                  </div>
                </div>
              </Show>

              {/* User Info */}
              <div class="space-y-6">
                {/* Name */}
                <div>
                  <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
                    {user()!.name} {user()!.surname}
                  </h1>
                  <p class="text-gray-600 dark:text-gray-400">{user()!.email}</p>
                </div>

                {/* Stats Grid */}
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Trustlevel */}
                  <div class="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl border border-green-200 dark:border-green-800">
                    <div class="flex items-center gap-3">
                      <div class="p-2 bg-green-500 rounded-lg">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <div>
                        <p class="text-sm text-gray-600 dark:text-gray-400">Trustlevel</p>
                        <p class="text-2xl font-bold text-gray-900 dark:text-white">{user()!.trustlevel}</p>
                      </div>
                    </div>
                  </div>

                  {/* EXP */}
                  <div class="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl border border-purple-200 dark:border-purple-800">
                    <div class="flex items-center gap-3">
                      <div class="p-2 bg-purple-500 rounded-lg">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <p class="text-sm text-gray-600 dark:text-gray-400">Erfahrungspunkte</p>
                        <p class="text-2xl font-bold text-gray-900 dark:text-white">{user()!.exp} EXP</p>
                      </div>
                    </div>
                  </div>

                  {/* Bewertete Produkte */}
                  <div class="p-4 bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-900/20 dark:to-sky-800/20 rounded-xl border border-sky-200 dark:border-sky-800">
                    <div class="flex items-center gap-3">
                      <div class="p-2 bg-sky-500 rounded-lg">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </div>
                      <div>
                        <p class="text-sm text-gray-600 dark:text-gray-400">Bewertete Produkte</p>
                        <p class="text-2xl font-bold text-gray-900 dark:text-white">{Math.floor(user()!.exp / 10)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Zusätzliche Info */}
                <div class="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Mitglied seit:</strong> {new Date().toLocaleDateString('de-DE')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Show>
      </main>
    </div>
  );
}
