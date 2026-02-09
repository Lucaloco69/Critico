import { Accessor, Setter } from "solid-js";

export function useTags(
  selectedTags: Accessor<number[]>,
  setSelectedTags: Setter<number[]>
) {
  const toggleTag = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  return { toggleTag };
}
