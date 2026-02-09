import { createSignal, Accessor, Setter } from "solid-js";
import { supabase } from "../../lib/supabaseClient";
import { UserProfileComputed } from "./useProfile";

export function useProfilePicture(
  user: Accessor<UserProfileComputed | null>,
  setUser: Setter<UserProfileComputed | null>
) {
  const [uploading, setUploading] = createSignal(false);
  const [error, setError] = createSignal("");
  const [success, setSuccess] = createSignal("");

  const handleFileUpload = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file || !user()) return;

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Nicht authentifiziert");

      if (user()!.picture) {
        const oldPath = user()!.picture!.split("/").slice(-2).join("/");
        await supabase.storage.from("profile_pictures").remove([oldPath]);
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${authUser.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("profile_pictures")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("profile_pictures").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("User")
        .update({ picture: publicUrl })
        .eq("id", user()!.id);

      if (updateError) throw updateError;

      setUser({ ...user()!, picture: publicUrl });
      setSuccess("Profilbild erfolgreich aktualisiert!");
    } catch (err: any) {
      console.error("Upload-Fehler:", err);
      setError(err.message || "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePicture = async () => {
    if (!user()?.picture || !confirm("Profilbild wirklich löschen?")) return;

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const oldPath = user()!.picture!.split("/").slice(-2).join("/");
      const { error: deleteError } = await supabase.storage
        .from("profile_pictures")
        .remove([oldPath]);
      if (deleteError) throw deleteError;

      const { error: updateError } = await supabase
        .from("User")
        .update({ picture: null })
        .eq("id", user()!.id);
      if (updateError) throw updateError;

      setUser({ ...user()!, picture: null });
      setSuccess("Profilbild gelöscht");
    } catch (err: any) {
      console.error("Löschen fehlgeschlagen:", err);
      setError(err.message || "Löschen fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  };

  return {
    uploading,
    error,
    success,
    handleFileUpload,
    handleDeletePicture,
  };
}
