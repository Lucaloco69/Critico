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
  price: number | null; // ✅ NEU: für Trustlevel-Range
  tags?: { id: number; name: string }[];
}

interface Tag {
  id: number;
  name: string;
}

// ✅ Globale Variablen für Channels
let globalHomeMessagesChannel: any = null;
let globalHomeProductsChannel: any = null;

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
  const [currentTrustlevel, setCurrentTrustlevel] = createSignal<number>(0); // ✅ TL0 default


  // ✅ Nutze globalen Badge Store (Requests entfernt)
  const { setDirectMessageCount } = badgeStore;


  const maxPriceForTrustlevel = (tl: number) => {
    switch (tl) {
      case 0:
        return 2; // ✅ TL0 = 2€
      case 1:
        return 5;
      case 2:
        return 25;
      case 3:
        return 50;
      case 4:
        return 200;
      default:
        return 999999; // TL5+
    }
  };

  // ✅ loadProducts als wiederverwendbare Funktion
  const loadProducts = async () => {
    try {
      console.log("🔄 HOME: Loading products...");

      setLoading(true);


      // Hole alle Tags
      const { data: tagsData, error: tagsError } = await supabase
        .from("Tags")
        .select("id, name")
        .order("name");


      if (tagsError) throw tagsError;
      setTags(tagsData || []);

      const maxPrice = maxPriceForTrustlevel(currentTrustlevel());

      // Hole Produkte (jetzt inkl. price) + filtere serverseitig nach Preis
      const { data: productsData, error: productsError } = await supabase
        .from("Product")
        .select(`
          id,
          name,
          beschreibung,
          price,
          owner_id,
          stars,
          Product_Tags (
            Tags (
              id,
              name
            )
          ),
          product_images (
            id,
            image_url,
            order_index
          )
        `)
        .lte("price", maxPrice) // ✅ nur im Trustlevel-Range [web:278]
        .order("id", { ascending: false });


      if (productsError) throw productsError;


      // Transformiere: Erstes Bild aus Product_Images als Hauptbild
      const transformedProducts = (products || []).map((p: any) => {
        const allImages: string[] = [];

        if (p.product_images && p.product_images.length > 0) {
          const images = p.product_images
            .sort((a: any, b: any) => a.order_index - b.order_index)
            .map((img: any) => img.image_url);
          allImages.push(...images);
        }


        return {
          id: p.id,
          name: p.name,
          beschreibung: p.beschreibung,
          price: p.price ?? null,
          picture: allImages[0] || null,
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
  };

  // Lade User-ID + Trustlevel einmal beim Start
  createEffect(async () => {
    if (!isLoggedIn() || !sessionStore.user) {
      setCurrentUserId(null);
      setCurrentTrustlevel(0);
      return;
    }


    try {
      const { data: userData, error } = await supabase
        .from("User")
        .select("id, trustlevel")
        .eq("auth_id", sessionStore.user.id)
        .maybeSingle();

      if (error) throw error;

      if (userData) {
        setCurrentUserId(userData.id);
        setCurrentTrustlevel(userData.trustlevel ?? 0);
      }
    } catch (err) {
      console.error("Error loading user:", err);
    }
  });

  // ✅ Wenn Trustlevel sich ändert, Produkte neu laden
  createEffect(() => {
    currentTrustlevel();
    loadProducts();
  });

  // ✅ Realtime Setup in onMount
  onMount(() => {
    // Initial laden (passiert auch durch Effect, aber schadet nicht)
    loadProducts();


    // Warte bis userId geladen ist
    const checkUserAndSetup = setInterval(() => {
      const userId = currentUserId();
      if (userId) {
        clearInterval(checkUserAndSetup);

        console.log("🚀 HOME: Setup Realtime für User:", userId);
        
        // Initial laden (nur noch Direct Messages)
        loadDirectMessageCount(userId);


        // ✅ Messages Channel - jetzt auch für Requests
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
                filter: `receiver_id=eq.${userId}`,
              },
              (payload) => {
                console.log("🔔 HOME: Messages Event empfangen:", payload.eventType);
                
                // Zähle nur ungelesene direct messages UND requests
                if (payload.new.message_type === "direct" || payload.new.message_type === "request") {
                  loadDirectMessageCount(userId);
                }
              }
            )
            .subscribe((status) => {
              console.log("📡 HOME Messages Channel Status:", status);
            });
        }


        if (!globalHomeProductsChannel) {
          console.log("🔌 HOME: Creating Products Channel");
          globalHomeProductsChannel = supabase
            .channel("home_products_changes")
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "Product",
              },
              (payload) => {
                console.log("🔔 HOME: Product UPDATE Event!", payload);
                console.log("🔄 HOME: Calling loadProducts...");
                loadProducts();
              }
            )
            .subscribe((status) => {
              console.log("📡 HOME Products Channel Status:", status);
            });
        }
      }
    }, 100);


    // Cleanup nach 10 Sekunden falls User nicht geladen
    setTimeout(() => clearInterval(checkUserAndSetup), 10000);
  });

  // ✅ Cleanup beim Unmount
  onCleanup(() => {
    console.log("🧹 HOME: Cleanup aufgerufen");
    if (globalHomeProductsChannel) {
      supabase.removeChannel(globalHomeProductsChannel);
      globalHomeProductsChannel = null;
    }
    if (globalHomeMessagesChannel) {
      supabase.removeChannel(globalHomeMessagesChannel);
      globalHomeMessagesChannel = null;
    }
  });


  // ✅ Helper: Lade ungelesene Messages (Direct + Requests)
  const loadDirectMessageCount = async (userId: number) => {
    try {
      console.log("📊 HOME: Lade ungelesene Nachrichten für User:", userId);

      const { data, error } = await supabase
        .from("Messages")
        .select("id, sender_id, receiver_id, read, message_type")
        .in("message_type", ["direct", "request"]) // ✅ Beide Typen
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

  // Filter-Logik (Tags + Search) - arbeitet auf bereits preis-gefilterten Produkten
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


  const handleCreateProduct = () => {
    if (!isLoggedIn()) {
      navigate("/login");
    } else {
      navigate("/createProduct");
    }
  };


  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
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
          <For each={filteredProducts()}>{(product) => <ProductCard product={product} />}</For>
        </div>
      </main>
    </div>
  );
}
