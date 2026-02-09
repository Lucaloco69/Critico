import { A } from "@solidjs/router";
import { Accessor, Setter, createSignal } from "solid-js";
import { FilterDropdown } from "../FilterDropdown";
import { SearchBar } from "../SearchBar";
import { HeaderActions } from "../HeaderActions";
import { Tag } from "../../hooks/home/useTags";

interface HomeHeaderProps {
  tags: Accessor<Tag[]>;
  selectedTags: Accessor<number[]>;
  setSelectedTags: Setter<number[]>;
  searchQuery: Accessor<string>;
  setSearchQuery: Setter<string>;
  onCreateProduct: () => void;
}

export default function HomeHeader(props: HomeHeaderProps) {
  const [showFilterDropdown, setShowFilterDropdown] = createSignal(false);

  return (
    <header class="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-md">
      <div class="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        <A href="/" class="text-2xl font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 transition-colors">
          Critico
        </A>

        <FilterDropdown
          tags={props.tags}
          selectedTags={props.selectedTags}
          setSelectedTags={props.setSelectedTags}
          showDropdown={showFilterDropdown}
          setShowDropdown={setShowFilterDropdown}
        />

        <SearchBar searchQuery={props.searchQuery} setSearchQuery={props.setSearchQuery} />

        <HeaderActions onCreateProduct={props.onCreateProduct} />
      </div>
    </header>
  );
}
