import { createSignal, createEffect, Accessor } from "solid-js";
import { Product } from "./useProducts";

export function useProductFilters(products: Accessor<Product[]>) {
  const [selectedTags, setSelectedTags] = createSignal<number[]>([]);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [filteredProducts, setFilteredProducts] = createSignal<Product[]>([]);

  createEffect(() => {
    const query = searchQuery().toLowerCase();
    const selected = selectedTags();

    let filtered = products();

    // Filter nach Tags
    if (selected.length > 0) {
      filtered = filtered.filter((p) => p.tags?.some((t) => selected.includes(t.id)));
    }

    // Filter nach Suchbegriff
    if (query) {
      filtered = filtered.filter(
        (p) => p.name.toLowerCase().includes(query) || p.beschreibung?.toLowerCase().includes(query)
      );
    }

    setFilteredProducts(filtered);
  });

  return {
    selectedTags,
    setSelectedTags,
    searchQuery,
    setSearchQuery,
    filteredProducts,
  };
}
