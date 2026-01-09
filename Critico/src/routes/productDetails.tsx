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
  picture: string | null;
  owner_id: number;
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
  picture: string | null;
  owner_id: number;
  User: Product["User"];
  Product_Tags?: {
    Tags: { id: number; name: string } | null;
  }[];
}

export default function ProductDetail() {
  const params = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = createSignal<Product | null>(null);
  const [comments, setComments] = createSignal<Comment[]>([]);
  const [newComment, setNewComment] = createSignal("");
  const [loading, setLoading] = createSignal(true);
  const [submittingComment, setSubmittingComment] = createSignal(false);
  const [currentUserId, setCurrentUserId] = createSignal<number | null>(null);

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

      /* -------- Produkt -------- */

      const { data: productData, error: productError } = await supabase
        .from("Product")
        .select(`
          id,
          name,
          beschreibung,
          picture,
          owner_id,
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
          )
        `)
        .eq("id", productId)
        .single<ProductDB>();

      if (productError || !productData) throw productError;

      const transformedProduct: Product = {
        id: productData.id,
        name: productData.name,
        beschreibung: productData.beschreibung,
        picture: productData.picture,
        owner_id: productData.owner_id,
        User: productData.User,
        tags:
          productData.Product_Tags
            ?.map(pt => pt.Tags)
            .filter(
              (t): t is { id: number; name: string } => Boolean(t)
            ) ?? [],
      };

      setProduct(transformedProduct);

      /* -------- Kommentare laden über Chat -------- */

      const { data: chatData, error: chatError } = await supabase
        .from("Chats")
        .select("id")
        .eq("product_id", productId)
        .maybeSingle();

      if (chatData && chatData.id) {
        const { data: messagesData, error: messagesError } = await supabase
          .from("Messages")
          .select(`
            id,
            content,
            created_at,
            sender_id,
            User!Messages_sender_id_fkey (
              id,
              name,
              surname,
              picture
            )
          `)
          .eq("chat_id", chatData.id)
          .order("created_at", { ascending: true });

        if (messagesError) {
          console.error("Error loading messages:", messagesError);
        }

        const transformedComments: Comment[] = (messagesData ?? []).map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          created_at: msg.created_at,
          sender_id: msg.sender_id,
          User: msg.User || null,
        }));

        setComments(transformedComments);
      } else {
        console.log("No chat found for this product yet");
        setComments([]);
      }
    } catch (err) {
      console.error("Error loading product:", err);
    } finally {
      setLoading(false);
    }
  });

  /* =========================
     Kommentar absenden
  ========================= */

  const handleSubmitComment = async (e: Event) => {
  e.preventDefault();

  if (!isLoggedIn()) {
    navigate("/login");
    return;
  }

  if (!newComment().trim() || !currentUserId()) return;

  setSubmittingComment(true);

  try {
    const productId = Number(params.id);
    const userId = currentUserId()!;

    // 1. Hole oder erstelle Chat für dieses Produkt
    let { data: existingChat } = await supabase
      .from("Chats")
      .select("id")
      .eq("product_id", productId)
      .maybeSingle();

    let chatId: number;

    if (!existingChat) {
      // Erstelle neuen Chat
      const { data: newChat, error: chatCreateError } = await supabase
        .from("Chats")
        .insert({
          product_id: productId,
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (chatCreateError || !newChat) throw chatCreateError;
      chatId = newChat.id;
    } else {
      chatId = existingChat.id;
    }

    // 2. Füge die Nachricht hinzu (OHNE Chat_Participants)
    const { data, error } = await supabase
      .from("Messages")
      .insert({
        content: newComment(),
        sender_id: userId,
        chat_id: chatId,
        product_id: productId,
        created_at: new Date().toISOString(),
      })
      .select(`
        id,
        content,
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

    if (error || !data) throw error;

    setComments([...comments(), data as any]);
    setNewComment("");
  } catch (err) {
    console.error("Error submitting comment:", err);
    alert("Fehler beim Kommentieren.");
  } finally {
    setSubmittingComment(false);
  }
};

  /* =========================
     Button Handler
  ========================= */

  const handleRequestTest = () => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
    
    // Scroll zum Kommentar-Bereich mit vorausgefüllter Nachricht
    setNewComment("Hallo! Ich würde gerne einen Produkttest anfragen. Ist das möglich?");
    
    // Scroll zum Kommentarbereich
    const commentSection = document.querySelector('#comment-section');
    commentSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleContact = () => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
    
    // Option: Direkten Chat starten (wenn du eine Chat-Seite hast)
    // navigate(`/chat/${product()!.owner_id}`);
    
    // Aktuell: Scroll zu Kommentaren
    const commentSection = document.querySelector('#comment-section');
    commentSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  /* =========================
     JSX
  ========================= */

  return (
    <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header mit Zurück-Button */}
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
              {/* Linke Seite: Bild */}
              <div class="relative bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600">
                <Show
                  when={product()!.picture}
                  fallback={
                    <div class="aspect-square flex items-center justify-center">
                      <svg class="w-32 h-32 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  }
                >
                  <img
                    src={product()!.picture!}
                    alt={product()!.name}
                    class="w-full h-full object-cover aspect-square"
                  />
                </Show>
              </div>

              {/* Rechte Seite: Details */}
              <div class="p-8 lg:p-12">
                <h1 class="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
                  {product()!.name}
                </h1>

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

                {/* Produkttest Anfrage Buttons */}
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
              Kommentare ({comments().length})
            </h2>

            {/* Kommentar-Formular */}
            <Show when={isLoggedIn()}>
              <form onSubmit={handleSubmitComment} class="mb-8">
                <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border-2 border-gray-200 dark:border-gray-600 focus-within:border-sky-500 dark:focus-within:border-sky-400 transition-colors">
                  <textarea
                    value={newComment()}
                    onInput={(e) => setNewComment(e.currentTarget.value)}
                    placeholder="Teile deine Meinung zu diesem Produkt..."
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
                    {submittingComment() ? "Wird gesendet..." : "Kommentar absenden"}
                  </button>
                </div>
              </form>
            </Show>

            <Show when={!isLoggedIn()}>
              <div class="mb-8 p-6 bg-sky-50 dark:bg-sky-900/20 rounded-xl border border-sky-200 dark:border-sky-800 text-center">
                <p class="text-gray-700 dark:text-gray-300 mb-3">
                  Melde dich an, um einen Kommentar zu hinterlassen
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
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p class="text-gray-500 dark:text-gray-400">
                    Noch keine Kommentare. Sei der Erste!
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
