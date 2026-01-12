import { createSignal, createEffect, For, Show } from "solid-js";
import { useParams, A, useNavigate } from "@solidjs/router";
import { supabase } from "../lib/supabaseClient";
import { isLoggedIn } from "../lib/sessionStore";

/* =========================
   Interfaces (UI)
========================= */

interface Product {
  id: number;
  name: string;
  beschreibung: string;
  price: number | null;
  picture: string | null;
  images: string[];
  owner_id: number;
  stars: number;
  User?: {
    id: number;
    name: string;
    surname: string;
    email: string;
    picture: string | null;
  };
  tags: { id: number; name: string }[];
}

interface Comment {
  id: number;
  content: string;
  stars: number | null;
  created_at: string;
  sender_id: number;
  User: {
    id: number;
    name: string;
    surname: string;
    picture: string | null;
  } | null;
}

/* =========================
   Interfaces (DB)
========================= */

interface ProductDB {
  id: number;
  name: string;
  beschreibung: string;
  price: number | null;
  owner_id: number;
  stars: number;
  User: Product["User"];
  Product_Tags?: {
    Tags: { id: number; name: string } | null;
  }[];
  Product_Images?: {
    id: number;
    image_url: string;
    order_index: number;
  }[];
}

/* =========================
   Star Rating Component
========================= */

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: "sm" | "md" | "lg";
}

function StarRating(props: StarRatingProps) {
  const maxStars = () => props.maxStars || 5;
  const sizeClass = () => {
    switch (props.size || "md") {
      case "sm": return "w-4 h-4";
      case "lg": return "w-6 h-6";
      default: return "w-5 h-5";
    }
  };

  const gradientId = `starGradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div class="flex items-center gap-1">
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
          
          let filling: number;
          if (diff >= 1) {
            filling = 1;
          } else if (diff >= 0.75) {
            filling = 1;
          } else if (diff >= 0.25) {
            filling = 0.5;
          } else {
            filling = 0;
          }

          return (
            <div class={`relative ${sizeClass()}`}>
              <svg 
                class="absolute w-full h-full text-gray-200 dark:text-gray-700 drop-shadow-sm" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>

              <div 
                class="absolute overflow-hidden top-0 left-0 h-full transition-all duration-200" 
                style={`width: ${filling * 100}%`}
              >
                <svg 
                  class={`${sizeClass()} drop-shadow-md`}
                  fill={`url(#${gradientId})`}
                  viewBox="0 0 20 20"
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

export default function ProductDetail() {
  const params = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = createSignal<Product | null>(null);
  const [comments, setComments] = createSignal<Comment[]>([]);
  const [newComment, setNewComment] = createSignal("");
  const [newCommentStars, setNewCommentStars] = createSignal<number>(0);
  const [loading, setLoading] = createSignal(true);
  const [submittingComment, setSubmittingComment] = createSignal(false);
  const [currentUserId, setCurrentUserId] = createSignal<number | null>(null);
  
  // Bild-Navigation
  const [currentImageIndex, setCurrentImageIndex] = createSignal(0);
  const [allImages, setAllImages] = createSignal<string[]>([]);
  const [canComment, setCanComment] = createSignal<boolean>(false);
  const [checkingPermission, setCheckingPermission] = createSignal(true);

  /* =========================
     Permission Check
  ========================= */

  const checkCommentPermission = async (userId: number, productId: number): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("ProductComments_User")
        .select("user_id")
        .eq("user_id", userId)
        .eq("product_id", productId)
        .maybeSingle();

      if (error) {
        console.error("❌ Permission check error:", error);
        return false;
      }

      return !!data;
    } catch (err) {
      console.error("💥 Permission check failed:", err);
      return false;
    }
  };

  // Prüfe Kommentar-Berechtigung beim Laden
  createEffect(async () => {
    const userId = currentUserId();
    const productId = Number(params.id);
    
    if (!userId || !productId || isNaN(productId)) {
      setCanComment(false);
      setCheckingPermission(false);
      return;
    }

    const hasPermission = await checkCommentPermission(userId, productId);
    setCanComment(hasPermission);
    setCheckingPermission(false);
    
    console.log(hasPermission ? "✅ User can comment" : "⛔ User cannot comment");
  });

  /* =========================
     Aktuellen User laden
  ========================= */

  createEffect(async () => {
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      const { data: userData, error } = await supabase
        .from("User")
        .select("id")
        .eq("auth_id", data.user.id)
        .single();

      if (error) throw error;
      setCurrentUserId(userData.id);
    } catch (err) {
      console.error("Error loading current user:", err);
    }
  });

  /* =========================
     Produkt + Kommentare laden
  ========================= */

  createEffect(async () => {
    try {
      setLoading(true);
      const productId = Number(params.id);

      /* -------- Produkt OHNE picture Spalte -------- */

      const { data: productData, error: productError } = await supabase
        .from("Product")
        .select(`
          id,
          name,
          beschreibung,
          price,
          owner_id,
          stars,
          User!Product_owner_id_fkey (
            id,
            name,
            surname,
            email,
            picture
          ),
          Product_Tags (
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
        .eq("id", productId)
        .single<ProductDB>();

      if (productError || !productData) throw productError;

      // Sammle alle Bilder aus Product_Images
      const imagesList: string[] = [];
      if (productData.Product_Images && productData.Product_Images.length > 0) {
        const images = productData.Product_Images
          .sort((a, b) => a.order_index - b.order_index)
          .map(img => img.image_url);
        imagesList.push(...images);
      }
      setAllImages(imagesList);

      const transformedProduct: Product = {
        id: productData.id,
        name: productData.name,
        beschreibung: productData.beschreibung,
        price: productData.price,
        picture: imagesList[0] || null,
        images: imagesList,
        owner_id: productData.owner_id,
        stars: productData.stars || 0,
        User: productData.User,
        tags:
          productData.Product_Tags
            ?.map(pt => pt.Tags)
            .filter(
              (t): t is { id: number; name: string } => Boolean(t)
            ) ?? [],
      };

      setProduct(transformedProduct);

      /* -------- Kommentare laden -------- */

      const { data: messagesData, error: messagesError } = await supabase
        .from("Messages")
        .select(`
          id,
          content,
          stars,
          created_at,
          sender_id,
          User!Messages_sender_id_fkey (
            id,
            name,
            surname,
            picture
          )
        `)
        .eq("product_id", productId)
        .eq("message_type", "product")
        .order("created_at", { ascending: true });

      if (messagesError) {
        console.error("Error loading messages:", messagesError);
      }

      const transformedComments: Comment[] = (messagesData ?? []).map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        stars: msg.stars,
        created_at: msg.created_at,
        sender_id: msg.sender_id,
        User: msg.User || null,
      }));

      setComments(transformedComments);

      // Berechne durchschnittliche Sterne
      if (transformedComments.length > 0) {
        const validStars = transformedComments
          .filter(c => c.stars !== null && c.stars !== undefined)
          .map(c => c.stars!);
        
        if (validStars.length > 0) {
          const avgStars = validStars.reduce((sum, s) => sum + s, 0) / validStars.length;
          
          await supabase
            .from("Product")
            .update({ stars: avgStars })
            .eq("id", productId);
          
          setProduct(prev => prev ? { ...prev, stars: avgStars } : null);
        }
      }

    } catch (err) {
      console.error("Error loading product:", err);
    } finally {
      setLoading(false);
    }
  });

  // Bild-Navigation
  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev < allImages().length - 1 ? prev + 1 : prev
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  /* =========================
     Kommentar absenden
  ========================= */

  const handleSubmitComment = async (e: Event) => {
    e.preventDefault();

    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }

    const userId = currentUserId();
    const productId = Number(params.id);

    if (!userId || !newComment().trim()) return;

    try {
      // Erneute Überprüfung direkt vor Submit
      const hasPermission = await checkCommentPermission(userId, productId);

      if (!hasPermission) {
        alert("Du hast keine Berechtigung, dieses Produkt zu kommentieren. Nur verifizierte Käufer können Bewertungen abgeben.");
        setCanComment(false);
        return;
      }

      setSubmittingComment(true);

      const { data: existingChat } = await supabase
        .from("Chats")
        .select("id")
        .eq("product_id", productId)
        .maybeSingle();

      let chatId: number;

      if (existingChat) {
        chatId = existingChat.id;
      } else {
        const { data: newChat, error: chatError } = await supabase
          .from("Chats")
          .insert({
            product_id: productId,
            created_at: new Date().toISOString()
          })
          .select("id")
          .single();

        if (chatError) throw chatError;
        chatId = newChat.id;
      }

      const insertData: any = {
        content: newComment(),
        sender_id: userId,
        product_id: productId,
        chat_id: chatId,
        message_type: "product",
        created_at: new Date().toISOString(),
      };

      if (newCommentStars() > 0) {
        insertData.stars = newCommentStars();
      }

      const { data, error } = await supabase
        .from("Messages")
        .insert(insertData)
        .select(`
          id,
          content,
          stars,
          created_at,
          sender_id,
          User!Messages_sender_id_fkey (
            id,
            name,
            surname,
            picture
          )
        `)
        .single();

      if (error) {
        console.error("❌ Insert error:", error);
        
        // RLS Policy blockiert Insert
        if (error.code === "42501" || error.message.includes("policy")) {
          alert("Du hast keine Berechtigung, dieses Produkt zu kommentieren.");
          setCanComment(false);
          return;
        }
        
        throw error;
      }

      if (!data) throw new Error("No data returned from insert");

      const updatedComments = [data as any, ...comments()];
      setComments(updatedComments);
      setNewComment("");
      setNewCommentStars(0);

      // Berechne Durchschnitt
      const validStars = updatedComments
        .map(c => c.stars)
        .filter((s): s is number => typeof s === 'number' && !isNaN(s) && s > 0);

      if (validStars.length > 0) {
        const avgStars = validStars.reduce((sum, s) => sum + s, 0) / validStars.length;
        const roundedAvg = Math.round(avgStars * 2) / 2;
        
        console.log("📊 Avg calculation:", { stars: validStars, raw: avgStars.toFixed(2), rounded: roundedAvg });
        
        const { error: updateError } = await supabase
          .from("Product")
          .update({ stars: roundedAvg })
          .eq("id", productId);
        
        if (updateError) {
          console.error("Error updating product stars:", updateError);
        } else {
          setProduct(prev => prev ? { ...prev, stars: roundedAvg } : null);
        }
      }

    } catch (err: any) {
      console.error("Error submitting comment:", err);
      alert("Fehler beim Kommentieren: " + (err.message || "Unbekannter Fehler"));
    } finally {
      setSubmittingComment(false);
    }
  };

  /* =========================
     Button Handler
  ========================= */

  const handleRequestTest = async () => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }

    try {
      const userId = currentUserId();
      const productId = product()!.id;

      if (!userId) {
        alert("Fehler: User nicht gefunden");
        return;
      }

      const { data: existingRequest } = await supabase
        .from("Requests")
        .select("id")
        .eq("sender_id", userId)
        .eq("product_id", productId)
        .maybeSingle();

      if (existingRequest) {
        alert("Du hast bereits eine Anfrage für dieses Produkt gesendet!");
        return;
      }

      const { error } = await supabase
        .from("Requests")
        .insert({
          sender_id: userId,
          product_id: productId,
        });

      if (error) throw error;

      alert("✅ Anfrage erfolgreich gesendet! Der Besitzer wird benachrichtigt.");
    } catch (err) {
      console.error("Error sending request:", err);
      alert("Fehler beim Senden der Anfrage.");
    }
  };

  const handleContact = () => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
    
    const ownerId = product()?.owner_id;
    if (ownerId) {
      navigate(`/chat/${ownerId}`);
    }
  };

  /* =========================
     Utils
  ========================= */

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return "Preis auf Anfrage";
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  };

  /* =========================
     JSX
  ========================= */

  return (
    <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header class="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <A href="/home" class="text-2xl font-bold text-sky-600 dark:text-sky-400">
            Critico
          </A>
        </div>
      </header>

      <Show when={loading()}>
        <div class="flex justify-center items-center py-20">
          <div class="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Show>

      <Show when={!loading() && product()}>
        <main class="max-w-7xl mx-auto px-4 py-8">
          {/* Produktdetails */}
          <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden mb-8">
            <div class="grid lg:grid-cols-2 gap-0">
              {/* Linke Seite: Bilder-Galerie */}
              <div class="relative bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600">
                <Show
                  when={allImages().length > 0}
                  fallback={
                    <div class="aspect-square flex items-center justify-center">
                      <svg class="w-32 h-32 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  }
                >
                  <div class="relative aspect-square bg-white dark:bg-gray-900">
                    <img
                      src={allImages()[currentImageIndex()]}
                      alt={`${product()!.name} - Bild ${currentImageIndex() + 1}`}
                      class="w-full h-full object-contain"
                    />

                    {/* Navigation Pfeile */}
                    <Show when={allImages().length > 1}>
                      <button
                        onClick={prevImage}
                        disabled={currentImageIndex() === 0}
                        class="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed z-10"
                      >
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>

                      <button
                        onClick={nextImage}
                        disabled={currentImageIndex() === allImages().length - 1}
                        class="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed z-10"
                      >
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      <div class="absolute bottom-4 right-4 px-3 py-1 bg-black/60 text-white text-sm rounded-full">
                        {currentImageIndex() + 1} / {allImages().length}
                      </div>
                    </Show>
                  </div>

                  {/* Thumbnail-Leiste */}
                  <Show when={allImages().length > 1}>
                    <div class="flex gap-2 p-4 overflow-x-auto bg-gray-50 dark:bg-gray-800/50">
                      <For each={allImages()}>
                        {(url, index) => (
                          <button
                            onClick={() => setCurrentImageIndex(index())}
                            class={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                              currentImageIndex() === index()
                                ? "border-sky-500 ring-2 ring-sky-300 scale-105"
                                : "border-gray-300 dark:border-gray-600 hover:border-sky-400 opacity-70 hover:opacity-100"
                            }`}
                          >
                            <img
                              src={url}
                              alt={`Thumbnail ${index() + 1}`}
                              class="w-full h-full object-cover"
                            />
                          </button>
                        )}
                      </For>
                    </div>
                  </Show>
                </Show>
              </div>

              {/* Rechte Seite: Details */}
              <div class="p-8 lg:p-12">
                <h1 class="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
                  {product()!.name}
                </h1>

                {/* Sterne-Bewertung */}
                <div class="mb-6">
                  <Show when={product()!.stars > 0 && comments().filter(c => c.stars !== null).length > 0} fallback={
                    <div class="flex items-center gap-2">
                      <StarRating rating={0} maxStars={5} size="lg" />
                      <span class="text-sm text-gray-400 dark:text-gray-500 italic ml-2">
                        Noch keine Bewertungen
                      </span>
                    </div>
                  }>
                    <div class="flex items-center gap-3">
                      <StarRating rating={product()!.stars} maxStars={5} size="lg" />
                      <div class="flex items-baseline gap-2">
                        <span class="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                          {product()!.stars.toFixed(1)}
                        </span>
                        <span class="text-base text-gray-500 dark:text-gray-400 font-medium">
                          ({comments().filter(c => c.stars !== null && c.stars !== undefined).length})
                        </span>
                      </div>
                    </div>
                  </Show>
                </div>

                {/* Preis */}
                <div class="mb-6">
                  <div class="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-xl border-2 border-emerald-200 dark:border-emerald-800">
                    <svg class="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span class="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                      {formatPrice(product()!.price)}
                    </span>
                  </div>
                </div>

                {/* Tags */}
                <Show when={product()!.tags && product()!.tags.length > 0}>
                  <div class="flex flex-wrap gap-2 mb-6">
                    <For each={product()!.tags}>
                      {(tag) => (
                        <span class="px-4 py-1.5 bg-gradient-to-r from-sky-100 to-blue-100 dark:from-sky-900 dark:to-blue-900 text-sky-700 dark:text-sky-300 rounded-full text-sm font-medium shadow-sm">
                          {tag.name}
                        </span>
                      )}
                    </For>
                  </div>
                </Show>

                {/* Beschreibung */}
                <div class="mb-8">
                  <h2 class="text-lg font-semibold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
                    <svg class="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Beschreibung
                  </h2>
                  <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {product()!.beschreibung || "Keine Beschreibung vorhanden."}
                  </p>
                </div>

                {/* Besitzer Info */}
                <Show when={product()!.User}>
                  <div class="border-t dark:border-gray-700 pt-6 mb-6">
                    <div class="flex items-center gap-3">
                      <div class="w-12 h-12 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {product()!.User!.name.charAt(0)}{product()!.User!.surname.charAt(0)}
                      </div>
                      <div>
                        <p class="text-sm text-gray-500 dark:text-gray-400">Angeboten von</p>
                        <p class="font-semibold text-gray-900 dark:text-white">
                          {product()!.User!.name} {product()!.User!.surname}
                        </p>
                      </div>
                    </div>
                  </div>
                </Show>

                {/* Buttons */}
                <div class="space-y-3">
                  <button
                    onClick={handleRequestTest}
                    class="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-3"
                  >
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Produkttest anfragen
                  </button>
                  
                  <button
                    onClick={handleContact}
                    class="w-full py-3 px-6 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 hover:border-sky-500 dark:hover:border-sky-400 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Verkäufer kontaktieren
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Kommentare Sektion */}
          <div id="comment-section" class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <h2 class="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
              <svg class="w-7 h-7 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Bewertungen & Kommentare ({comments().length})
            </h2>

            {/* Kommentar-Formular mit Permission-Check */}
            <Show 
              when={!checkingPermission()}
              fallback={
                <div class="flex justify-center py-4 mb-6">
                  <div class="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              }
            >
              <Show 
                when={canComment()}
                fallback={
                  <div class="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div class="flex items-start gap-3">
                      <svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p class="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                          Keine Bewertungsberechtigung
                        </p>
                        <p class="text-sm text-yellow-700 dark:text-yellow-400">
                          Nur verifizierte Käufer können Bewertungen abgeben. Kaufe dieses Produkt, um eine Bewertung zu schreiben.
                        </p>
                      </div>
                    </div>
                  </div>
                }
              >
                <form onSubmit={handleSubmitComment} class="mb-8 space-y-4">
                  <div class="mb-4">
                    <label class="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                      Deine Bewertung (optional)
                    </label>
                    <div class="flex gap-2">
                      <For each={[1, 2, 3, 4, 5]}>
                        {(star) => (
                          <button
                            type="button"
                            onClick={() => setNewCommentStars(star === newCommentStars() ? 0 : star)}
                            class="transition-transform hover:scale-110"
                          >
                            <svg 
                              class={`w-8 h-8 ${star <= newCommentStars() ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}
                              fill="currentColor" 
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </button>
                        )}
                      </For>
                    </div>
                  </div>

                  <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border-2 border-gray-200 dark:border-gray-600 focus-within:border-sky-500 dark:focus-within:border-sky-400 transition-colors">
                    <textarea
                      value={newComment()}
                      onInput={(e) => setNewComment(e.currentTarget.value)}
                      placeholder="Teile deine Erfahrung mit diesem Produkt..."
                      class="w-full bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none resize-none"
                      rows="3"
                    />
                  </div>
                  <div class="flex justify-end mt-3">
                    <button
                      type="submit"
                      disabled={submittingComment() || !newComment().trim()}
                      class="px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg flex items-center gap-2"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      {submittingComment() ? "Wird gesendet..." : "Bewertung absenden"}
                    </button>
                  </div>
                </form>
              </Show>
            </Show>

            <Show when={!isLoggedIn()}>
              <div class="mb-8 p-6 bg-sky-50 dark:bg-sky-900/20 rounded-xl border border-sky-200 dark:border-sky-800 text-center">
                <p class="text-gray-700 dark:text-gray-300 mb-3">
                  Melde dich an, um eine Bewertung zu hinterlassen
                </p>
                <button
                  onClick={() => navigate("/login")}
                  class="px-6 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-semibold transition-colors"
                >
                  Anmelden
                </button>
              </div>
            </Show>

            {/* Kommentare Liste */}
            <div class="space-y-4">
              <Show when={comments().length === 0}>
                <div class="text-center py-12">
                  <svg class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  <p class="text-gray-500 dark:text-gray-400">
                    Noch keine Bewertungen. Sei der Erste!
                  </p>
                </div>
              </Show>

              <For each={comments()}>
                {(comment) => (
                  <div class="p-5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow">
                    <div class="flex items-start gap-3">
                      <div class="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow-md flex-shrink-0">
                        {comment.User ? comment.User.name.charAt(0) : "?"}
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between mb-2">
                          <div>
                            <div class="flex items-baseline gap-2 mb-1">
                              <span class="font-semibold text-gray-900 dark:text-white">
                                {comment.User
                                  ? `${comment.User.name} ${comment.User.surname}`
                                  : "Unbekannter Nutzer"}
                              </span>
                              <span class="text-sm text-gray-500 dark:text-gray-400">
                                {formatDate(comment.created_at)}
                              </span>
                            </div>
                            <Show when={comment.stars !== null && comment.stars !== undefined}>
                              <div class="flex items-center gap-2 mb-2">
                                <StarRating rating={comment.stars!} maxStars={5} size="sm" />
                                <span class="text-sm font-medium text-gray-600 dark:text-gray-400">
                                  {comment.stars!.toFixed(1)}
                                </span>
                              </div>
                            </Show>
                          </div>
                        </div>
                        <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>
        </main>
      </Show>
    </div>
  );
}
