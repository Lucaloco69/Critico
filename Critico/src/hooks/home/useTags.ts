import { createSignal, onMount } from "solid-js";
import { supabase } from "../../lib/supabaseClient";

export interface Tag {
  id: number;
  name: string;
}

export function useTags() {
  const [tags, setTags] = createSignal<Tag[]>([]);
  const [loading, setLoading] = createSignal(true);

  onMount(async () => {
    try {
      const { data: tagsData, error: tagsError } = await supabase
        .from("Tags")
        .select("id, name")
        .order("name");

      if (tagsError) throw tagsError;
      setTags(tagsData || []);
    } catch (err) {
      console.error("Fehler beim Laden der Tags:", err);
    } finally {
      setLoading(false);
    }
  });

  return {
    tags,
    loading,
  };
}
