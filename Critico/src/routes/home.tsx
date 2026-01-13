import { A, useNavigate } from "@solidjs/router";
import { supabase } from "../lib/supabaseClient";
import sessionStore, { isLoggedIn } from "../lib/sessionStore";
import { createSignal, createEffect, For, Show, onCleanup, onMount } from "solid-js";
import { FilterDropdown } from "../components/FilterDropdown";
import { SearchBar } from "../components/SearchBar";
import { HeaderActions } from "../components/HeaderActions";
import { ProductCard } from "../components/ProductCard";

interface Product {
  id: number;
  name: string;
  beschreibung: string;
  picture: string | null;
  owner_id: number;
  stars: number;
  tags?: { id: number; name: string }[];
}

interface Tag {
  id: number;
  name: string;
}

export function Home() {
  const navigate = useNavigate();

  const [products, setProducts] = createSignal<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = createSignal<Product[]>([]);
  const [tags, setTags] = createSignal<Tag[]>([]);
  const [selectedTags, setSelectedTags] = createSignal<number[]>([]);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [showFilterDropdown, setShowFilterDropdown] = createSignal(false);
  const [loading, setLoading] = createSignal(true);
  const [requestCount, setRequestCount] = createSignal(0);
  const [directMessageCount, setDirectMessageCount] = createSignal(0);
  const [currentUserId, setCurrentUserId] = createSignal<number | null>(null);


  // Lade User-ID einmal beim Start
  createEffect(async () => {
    if (!isLoggedIn() || !sessionStore.user) return;

    try {
      const { data: userData } = await supabase
        .from("User")
        .select("id")
        .eq("auth_id", sessionStore.user.id)
        .single();

      if (userData) {
        setCurrentUserId(userData.id);
      }
    } catch (err) {
      console.error("Error loading user:", err);
    }
  });

  // Lade Request Count und Direct Message Count
  createEffect(() => {
    const userId = currentUserId();
    if (!userId) return;

    loadRequestCount(userId);
    loadDirectMessageCount(userId);

    const requestsChannel = supabase
      .channel("requests_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Requests",
        },
        () => {
          loadRequestCount(userId);
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel("messages_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Messages",
          filter: `message_type=eq.direct`,
        },
        () => {
          loadDirectMessageCount(userId);
        }
      )
      .subscribe();

    onCleanup(() => {
      supabase.removeChannel(requestsChannel);
      supabase.removeChannel(messagesChannel);
    });
  });

  const loadRequestCount = async (userId: number) => {
    try {
      const { data, error } = await supabase
        .from("Requests")
        .select(`
          id,
          status,
          Product!inner (
            owner_id
          )
        `);

      if (error) throw error;

      const myPendingRequests = (data || []).filter(
        (r: any) => r.Product.owner_id === userId && r.status === null
      );

      setRequestCount(myPendingRequests.length);
    } catch (err) {
      console.error("Error loading request count:", err);
    }
  };

  const loadDirectMessageCount = async (userId: number) => {
    try {
      const { data, error } = await supabase
        .from("Messages")
        .select("id")
        .eq("message_type", "direct")
        .eq("receiver_id", userId)
        .eq("read", false)
        .neq("sender_id", userId);

      if (error) throw error;

      setDirectMessageCount((data || []).length);
    } catch (err) {
      console.error("Error loading direct message count:", err);
    }
  };

  // Lade Produkte + Tags aus DB
  createEffect(async () => {
    try {
      setLoading(true);

      const { data: tagsData, error: tagsError } = await supabase
        .from("Tags")
        .select("id, name")
        .order("name");

      if (tagsError) throw tagsError;
      setTags(tagsData || []);

      const { data: productsData, error: productsError } = await supabase
        .from("Product")
        .select(`
          id,
          name,
          beschreibung,
          owner_id,
          stars,
          Product_Tags (
            tags_id,
            Tags (
              id,
              name
            )
          ),
          Product_Images (
            id,
            image_url,
            order_index
          )
        `)
        .order("id", { ascending: false });

      if (productsError) throw productsError;

      const transformedProducts = (productsData || []).map((p: any) => {
        const allImages: string[] = [];
        
        if (p.Product_Images && p.Product_Images.length > 0) {
          const images = p.Product_Images
            .sort((a: any, b: any) => a.order_index - b.order_index)
            .map((img: any) => img.image_url);
          allImages.push(...images);
        }

        return {
          id: p.id,
          name: p.name,
          beschreibung: p.beschreibung,
          picture: allImages[0] || null,
          images: allImages,
          owner_id: p.owner_id,
          stars: p.stars || 0,
          tags: p.Product_Tags?.map((pt: any) => pt.Tags).filter(Boolean) || [],
        };
      });

      setProducts(transformedProducts);
      setFilteredProducts(transformedProducts);
    } catch (err) {
      console.error("Fehler beim Laden der Produkte:", err);
    } finally {
      setLoading(false);
    }
  });

  // Filter-Logik (Tags + Search)
  createEffect(() => {
    const query = searchQuery().toLowerCase();
    const selected = selectedTags();

    let filtered = products();

    if (selected.length > 0) {
      filtered = filtered.filter((p) =>
        p.tags?.some((t) => selected.includes(t.id))
      );
    }

    if (query) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.beschreibung?.toLowerCase().includes(query)
      );
    }

    setFilteredProducts(filtered);
  });

  const handleCreateProduct = () => {
    if (!isLoggedIn()) {
      navigate("/login");
    } else {
      navigate("/createProduct");
    }
  };

  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header / Navbar */}
      <header class="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-md">
        <div class="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <A href="/" class="text-2xl font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 transition-colors">
            Critico
          </A>

          <FilterDropdown
            tags={tags}
            selectedTags={selectedTags}
            setSelectedTags={setSelectedTags}
            showDropdown={showFilterDropdown}
            setShowDropdown={setShowFilterDropdown}
          />

          <SearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />

          <HeaderActions
            requestCount={requestCount}
            directMessageCount={directMessageCount}
            onCreateProduct={handleCreateProduct}
          />
        </div>
      </header>

      {/* Produkt-Grid */}
      <main class="max-w-7xl mx-auto px-4 py-8">
        <Show when={loading()}>
          <div class="flex justify-center items-center py-20">
            <div class="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </Show>

        <Show when={!loading() && filteredProducts().length === 0}>
          <div class="text-center py-20">
            <p class="text-gray-500 dark:text-gray-400 text-lg">Keine Produkte gefunden.</p>
          </div>
        </Show>

        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          <For each={filteredProducts()}>
            {(product) => <ProductCard product={product} />}
          </For>
        </div>
      </main>
    </div>
  );
}
