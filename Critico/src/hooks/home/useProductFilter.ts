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

    if (selected.length > 0) {
      filtered = filtered.filter((p) => p.tags?.some((t) => selected.includes(t.id)));
    }

    if (query) {
      filtered = filtered.filter(
        (p) => p.name.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query)
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
