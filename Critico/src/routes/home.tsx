import { A, useNavigate } from "@solidjs/router";
import { supabase } from "../lib/supabaseClient";
import sessionStore, { isLoggedIn } from "../lib/sessionStore";
import { createSignal, createEffect, For, Show, onCleanup, onMount } from "solid-js";
import { FilterDropdown } from "../components/FilterDropdown";
import { SearchBar } from "../components/SearchBar";
import { HeaderActions } from "../components/HeaderActions";
import { ProductCard } from "../components/ProductCard";
import { badgeStore } from "../lib/badgeStore";

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

// ✅ Globale Variablen für Channels
let globalHomeMessagesChannel: any = null;
let globalHomeRequestsChannel: any = null;

export function Home() {
  const navigate = useNavigate();

  const [products, setProducts] = createSignal<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = createSignal<Product[]>([]);
  const [tags, setTags] = createSignal<Tag[]>([]);
  const [selectedTags, setSelectedTags] = createSignal<number[]>([]);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [showFilterDropdown, setShowFilterDropdown] = createSignal(false);
  const [loading, setLoading] = createSignal(true);
  const [currentUserId, setCurrentUserId] = createSignal<number | null>(null);

  // ✅ Nutze globalen Badge Store
  const { setDirectMessageCount, setRequestCount } = badgeStore;

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

  // ✅ Realtime Setup in onMount
  onMount(() => {
    // Warte bis userId geladen ist
    const checkUserAndSetup = setInterval(() => {
      const userId = currentUserId();
      if (userId) {
        clearInterval(checkUserAndSetup);
        
        console.log("🚀 HOME: Setup Realtime für User:", userId);
        
        // Initial laden
        loadRequestCount(userId);
        loadDirectMessageCount(userId);

        // ✅ Setup Realtime nur einmal
        if (!globalHomeRequestsChannel) {
          console.log("🔌 HOME: Creating Requests Channel");
          globalHomeRequestsChannel = supabase
            .channel("home_requests_changes")
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "Requests",
              },
              () => {
                console.log("🔔 HOME: Requests Event");
                loadRequestCount(userId);
              }
            )
            .subscribe((status) => {
              console.log("📡 HOME Requests Channel Status:", status);
            });
        }

        if (!globalHomeMessagesChannel) {
          console.log("🔌 HOME: Creating Messages Channel");
          globalHomeMessagesChannel = supabase
            .channel("home_messages_changes")
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "Messages",
                filter: `message_type=eq.direct`,
              },
              (payload) => {
                console.log("🔔 HOME: Messages Event empfangen:", payload.eventType);
                loadDirectMessageCount(userId);
              }
            )
            .subscribe((status) => {
              console.log("📡 HOME Messages Channel Status:", status);
            });
        }
      }
    }, 100);

    // Cleanup nach 10 Sekunden falls User nicht geladen
    setTimeout(() => clearInterval(checkUserAndSetup), 10000);

    // ✅ Cleanup beim Unmount
    onCleanup(() => {
      console.log("🧹 HOME: Cleanup aufgerufen");
    });
  });

  // Helper-Funktion zum Laden der Request Count
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

      // Filtere: Nur pending Requests für MEINE Produkte
      const myPendingRequests = (data || []).filter(
        (r: any) => r.Product.owner_id === userId && r.status === null
      );

      setRequestCount(myPendingRequests.length);
    } catch (err) {
      console.error("Error loading request count:", err);
    }
  };

  // Helper-Funktion zum Laden ungelesener Direct Messages
  const loadDirectMessageCount = async (userId: number) => {
    try {
      console.log("📊 HOME: Lade ungelesene Nachrichten für User:", userId);
      
      const { data, error } = await supabase
        .from("Messages")
        .select("id, sender_id, receiver_id, read, content")
        .eq("message_type", "direct")
        .eq("receiver_id", userId)
        .eq("read", false)
        .neq("sender_id", userId);

      if (error) {
        console.error("❌ HOME: Fehler beim Laden:", error);
        throw error;
      }

      console.log("📬 HOME: Ungelesene Nachrichten gefunden:", (data || []).length);
      console.log("📋 HOME: Details:", data);
      
      setDirectMessageCount((data || []).length);
      
      console.log("🔢 HOME: DirectMessageCount State gesetzt auf:", (data || []).length);
    } catch (err) {
      console.error("Error loading direct message count:", err);
    }
  };

  // Lade Produkte + Tags aus DB
  createEffect(async () => {
    try {
      setLoading(true);

      // Hole alle Tags
      const { data: tagsData, error: tagsError } = await supabase
        .from("Tags")
        .select("id, name")
        .order("name");

      if (tagsError) throw tagsError;
      setTags(tagsData || []);

      // Hole Produkte OHNE picture Spalte
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

      // Transformiere: Erstes Bild aus Product_Images als Hauptbild
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

    // Filter nach Tags
    if (selected.length > 0) {
      filtered = filtered.filter((p) =>
        p.tags?.some((t) => selected.includes(t.id))
      );
    }

    // Filter nach Suchbegriff
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
          {/* Logo */}
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
