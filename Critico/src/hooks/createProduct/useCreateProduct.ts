import { createSignal, createEffect, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { supabase } from "../../lib/supabaseClient";
import sessionStore, { isLoggedIn } from "../../lib/sessionStore";

interface Tag {
  id: number;
  name: string;
}

export function useCreateProduct() {
  const navigate = useNavigate();

  const [name, setName] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [price, setPrice] = createSignal("");

  const [selectedFiles, setSelectedFiles] = createSignal<File[]>([]);
  const [previewUrls, setPreviewUrls] = createSignal<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = createSignal(0);

  const [availableTags, setAvailableTags] = createSignal<Tag[]>([]);
  const [selectedTags, setSelectedTags] = createSignal<number[]>([]);

  const [loading, setLoading] = createSignal(false);
  const [uploading, setUploading] = createSignal(false);
  const [error, setError] = createSignal("");
  const [success, setSuccess] = createSignal("");



  onMount(async () => {
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

  return {
    name,
    description,
    price,
    selectedFiles,
    previewUrls,
    currentImageIndex,
    availableTags,
    selectedTags,
    loading,
    uploading,
    error,
    success,

    setName,
    setDescription,
    setPrice,
    setSelectedFiles,
    setPreviewUrls,
    setCurrentImageIndex,
    setSelectedTags,
    setLoading,
    setUploading,
    setError,
    setSuccess,
  };
}
