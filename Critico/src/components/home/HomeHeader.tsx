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
    <header class="sticky top-0 z-50 border-b border-black/5 dark:border-white/10 bg-white/80 dark:bg-gray-900/70 backdrop-blur-md">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
        {/* Mobile/tablet: 2 rows. Desktop (lg+): 1 row */}
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
          {/* Left: Brand */}
          <A
            href="/home"
            class="shrink-0 text-xl sm:text-2xl font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 transition-colors"
          >
            Critico
          </A>

          {/* Right (desktop): actions on the far right */}
          <div class="lg:order-3 lg:ml-auto shrink-0">
            <HeaderActions onCreateProduct={props.onCreateProduct} />
          </div>

          {/* Middle: filter + search */}
          <div class="lg:order-2 flex flex-col gap-3 sm:flex-row sm:items-stretch lg:flex-1 lg:min-w-0">
            <div class="w-full sm:w-auto sm:shrink-0">
              <FilterDropdown
                tags={props.tags}
                selectedTags={props.selectedTags}
                setSelectedTags={props.setSelectedTags}
                showDropdown={showFilterDropdown}
                setShowDropdown={setShowFilterDropdown}
              />
            </div>

            <div class="w-full sm:flex-1 min-w-0">
              <SearchBar
                searchQuery={props.searchQuery}
                setSearchQuery={props.setSearchQuery}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
