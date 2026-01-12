import { A, useNavigate } from "@solidjs/router";
import { supabase } from "../lib/supabaseClient";
import sessionStore, { isLoggedIn } from "../lib/sessionStore";
import { createSignal, createEffect, For, Show, onCleanup, onMount } from "solid-js";


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


interface StarRatingProps {
  rating: number;
  maxStars?: number;
}


// StarRating Komponente mit halben Sternen
function StarRating(props: StarRatingProps) {
  const maxStars = () => props.maxStars || 5;
  
  // Eindeutige ID für diesen Stern-Set
  const gradientId = `starGradient-${Math.random().toString(36).substr(2, 9)}`;


  return (
    <div class="flex items-center gap-1">
      {/* SVG Definitions einmal für alle Sterne */}
      <svg style="width: 0; height: 0; position: absolute;">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#fbbf24;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#f59e0b;stop-opacity:1" />
          </linearGradient>
        </defs>
      </svg>


      <For each={Array.from({ length: maxStars() })}>
        {(_, index) => {
          const starIndex = index();
          const diff = props.rating - starIndex;
          
          // Berechne Füllung mit halben Sternen
          let filling: number;
          if (diff >= 1) {
            filling = 1; // Voller Stern
          } else if (diff >= 0.75) {
            filling = 1; // Runde ab 0.75 auf voll auf
          } else if (diff >= 0.25) {
            filling = 0.5; // Halber Stern
          } else {
            filling = 0; // Leerer Stern
          }


          return (
            <div class="relative w-5 h-5">
              {/* Leerer Stern (Hintergrund) */}
              <svg 
                class="absolute w-full h-full text-gray-200 dark:text-gray-700 drop-shadow-sm" 
                fill="currentColor" 
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>


              {/* Gefüllter Stern (überlagert) */}
              <div 
                class="absolute overflow-hidden top-0 left-0 h-full transition-all duration-200" 
                style={`width: ${filling * 100}%`}
              >
                <svg 
                  class="w-5 h-5 drop-shadow-md" 
                  fill={`url(#${gradientId})`}
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            </div>
          );
        }}
      </For>
    </div>
  );
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


  // Lade Request Count und Direct Message Count wenn User-ID vorhanden
  createEffect(() => {
    const userId = currentUserId();
    if (!userId) return;


    // Initial laden
    loadRequestCount(userId);
    loadDirectMessageCount(userId);


    // Realtime Subscription für Requests
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


    // Realtime Subscription für Direct Messages
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


    // Cleanup
    onCleanup(() => {
      supabase.removeChannel(requestsChannel);
      supabase.removeChannel(messagesChannel);
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


  // ✅ Helper-Funktion zum Laden ungelesener Direct Messages (NUR von anderen!)
  const loadDirectMessageCount = async (userId: number) => {
    try {
      const { data, error } = await supabase
        .from("Messages")
        .select("id")
        .eq("message_type", "direct")
        .eq("receiver_id", userId)
        .eq("read", false)
        .neq("sender_id", userId);  // ✅ Nicht von mir selbst


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


      // Hole alle Tags
      const { data: tagsData, error: tagsError } = await supabase
        .from("Tags")
        .select("id, name")
        .order("name");


      if (tagsError) throw tagsError;
      setTags(tagsData || []);


      // Hole alle Produkte mit ihren Tags (via Product_Tags join)
      const { data: productsData, error: productsError } = await supabase
        .from("Product")
        .select(`
          id,
          name,
          beschreibung,
          picture,
          owner_id,
          stars,
          Product_Tags (
            tags_id,
            Tags (
              id,
              name
            )
          )
        `)
        .order("id", { ascending: false });


      if (productsError) throw productsError;


      // Transformiere das Nested-Result in flache Struktur
      const transformedProducts = (productsData || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        beschreibung: p.beschreibung,
        picture: p.picture,
        owner_id: p.owner_id,
        stars: p.stars || 0,
        tags: p.Product_Tags?.map((pt: any) => pt.Tags).filter(Boolean) || [],
      }));


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


  const toggleTag = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };


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


          {/* Filter Dropdown */}
          <div class="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown())}
              class="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter
              <Show when={selectedTags().length > 0}>
                <span class="ml-1 px-2 py-0.5 bg-sky-500 text-white text-xs rounded-full">
                  {selectedTags().length}
                </span>
              </Show>
            </button>


            {/* Dropdown */}
            <Show when={showFilterDropdown()}>
              <div class="absolute top-full mt-2 left-0 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 max-h-96 overflow-y-auto">
                <p class="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Tags filtern</p>
                <For each={tags()}>
                  {(tag) => (
                    <label class="flex items-center gap-2 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-2">
                      <input
                        type="checkbox"
                        checked={selectedTags().includes(tag.id)}
                        onChange={() => toggleTag(tag.id)}
                        class="w-4 h-4 text-sky-600 rounded focus:ring-2 focus:ring-sky-500"
                      />
                      <span class="text-sm text-gray-700 dark:text-gray-300">{tag.name}</span>
                    </label>
                  )}
                </For>
                <Show when={selectedTags().length > 0}>
                  <button
                    onClick={() => setSelectedTags([])}
                    class="mt-3 w-full py-2 text-sm text-sky-600 hover:text-sky-700 font-medium"
                  >
                    Filter zurücksetzen
                  </button>
                </Show>
              </div>
            </Show>
          </div>


          {/* Suchleiste */}
          <div class="flex-1 max-w-xl">
            <div class="relative">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Produkte durchsuchen..."
                value={searchQuery()}
                onInput={(e) => setSearchQuery(e.currentTarget.value)}
                class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>


          {/* Action Icons */}
          <div class="flex items-center gap-3">
            {/* Produkt-Anfragen */}
            <A 
              href="/requests" 
              class="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Produkt-Anfragen"
            >
              <svg class="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <Show when={requestCount() > 0}>
                <span class="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                  {requestCount()}
                </span>
              </Show>
            </A>


            {/* Direct Messages */}
            <A 
              href="/messages" 
              class="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Private Nachrichten"
            >
              <svg class="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <Show when={directMessageCount() > 0}>
                <span class="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-blue-500 text-white text-xs font-bold rounded-full animate-pulse">
                  {directMessageCount()}
                </span>
              </Show>
            </A>


            {/* Gespeichert */}
            <button class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <svg class="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>


            {/* Profil */}
            <A href={isLoggedIn() ? "/profile" : "/login"} class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <svg class="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </A>


            {/* Artikel einstellen Button */}
            <button
              onClick={handleCreateProduct}
              class="px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              Artikel einstellen
            </button>
          </div>
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
            {(product) => (
              <A
                href={`/productDetails/${product.id}`}
                class="group bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-2xl transition-all overflow-hidden hover:-translate-y-1 duration-300"
              >
                {/* Optimiertes Bild mit Padding & Filter */}
                <div class="relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 p-3">
                  <div class="aspect-square bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-sm">
                    <Show
                      when={product.picture}
                      fallback={
                        <div class="w-full h-full flex items-center justify-center text-gray-400">
                          <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      }
                    >
                      <img
                        src={product.picture!}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        class="w-full h-full object-contain p-3 group-hover:scale-110 transition-transform duration-500 ease-out"
                        style="filter: brightness(1.05) contrast(1.08) saturate(1.05);"
                      />
                    </Show>
                  </div>


                  {/* Subtiler Overlay beim Hover */}
                  <div class="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-lg"></div>
                </div>


                {/* Info */}
                <div class="p-4 space-y-2.5">
                  <h3 class="font-semibold text-gray-900 dark:text-white truncate text-base">
                    {product.name}
                  </h3>


                  {/* Stern-Bewertung mit halben Sternen */}
                  <Show when={product.stars > 0} fallback={
                    <div class="flex items-center gap-2 h-5">
                      <span class="text-xs text-gray-400 dark:text-gray-500 italic">
                        Noch keine Bewertung
                      </span>
                    </div>
                  }>
                    <div class="flex items-center gap-2.5">
                      <StarRating rating={product.stars} maxStars={5} />
                      <span class="text-sm font-medium text-gray-700 dark:text-gray-300 tabular-nums">
                        {product.stars.toFixed(1)}
                      </span>
                    </div>
                  </Show>


                  <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed min-h-[2.5rem]">
                    {product.beschreibung}
                  </p>


                  {/* Tags */}
                  <Show when={product.tags && product.tags.length > 0}>
                    <div class="flex flex-wrap gap-1.5 pt-1">
                      <For each={product.tags?.slice(0, 2)}>
                        {(tag) => (
                          <span class="px-2.5 py-1 bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 text-xs rounded-full font-medium">
                            {tag.name}
                          </span>
                        )}
                      </For>
                      <Show when={product.tags!.length > 2}>
                        <span class="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full font-medium">
                          +{product.tags!.length - 2}
                        </span>
                      </Show>
                    </div>
                  </Show>
                </div>
              </A>
            )}
          </For>
        </div>
      </main>
    </div>
  );
}
