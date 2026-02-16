import { Accessor, Setter } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { supabase } from "../../lib/supabaseClient";
import sessionStore from "../../lib/sessionStore";

export function useProductSubmit(
  name: Accessor<string>,
  description: Accessor<string>,
  price: Accessor<string>,
  selectedFiles: Accessor<File[]>,
  selectedTags: Accessor<number[]>,
  setLoading: Setter<boolean>,
  setUploading: Setter<boolean>,
  setError: Setter<string>,
  setSuccess: Setter<string>
) {
  const navigate = useNavigate();

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (!sessionStore.user) throw new Error("Nicht eingeloggt");

      const { data: userData, error: userError } = await supabase
        .from("User")
        .select("id")
        .eq("auth_id", sessionStore.user.id)
        .maybeSingle();

      if (userError) throw userError;
      if (!userData) throw new Error("Benutzer nicht gefunden");

      const userId = userData.id;
      const pictureUrls: string[] = [];

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

          const { data: { publicUrl } } = supabase.storage
            .from("product_pictures")
            .getPublicUrl(filePath);

          pictureUrls.push(publicUrl);
        }

        setUploading(false);
      }

      const { data: productData, error: productError } = await supabase
        .from("Product")
        .insert({
          name: name(),
          beschreibung: description(),
          price: price() ? parseFloat(price()) : null,
          owner_id: userId,
        })
        .select()
        .single();

      if (productError) throw productError;

      if (pictureUrls.length > 0) {
        const imageInserts = pictureUrls.map((url, index) => ({
          product_id: productData.id,
          image_url: url,
          order_index: index,
        }));

        const { error: imagesError } = await supabase
          .from("product_images")
          .insert(imageInserts);

        if (imagesError) {
          console.error("Fehler beim Speichern der Bilder:", imagesError);
          throw imagesError;
        }
      }

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

  return { handleSubmit };
}
