import { createSignal, createEffect, Show, onCleanup } from "solid-js";
import { useParams, A, useNavigate } from "@solidjs/router";
import { supabase } from "../lib/supabaseClient";
import { isLoggedIn } from "../lib/sessionStore";
import ImageGallery from "../components/ImageGallery";
import ProductInfo from "../components/ProductInfo";
import CommentSection from "../components/CommentSection";
import type { Product, Comment } from "../types/product";




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
  product_images?: {
    id: number;
    image_url: string;
    order_index: number;
  }[];
}


interface ModalState {
  show: boolean;
  type: "error" | "success" | "warning" | "info";
  title: string;
  message: string;
  action?: () => void;
  actionLabel?: string;
}



export default function ProductDetail() {
  const params = useParams();
  const navigate = useNavigate();




  const [product, setProduct] = createSignal<Product | null>(null);
  const [comments, setComments] = createSignal<Comment[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [currentUserId, setCurrentUserId] = createSignal<number | null>(null);
  const [canComment, setCanComment] = createSignal<boolean>(false);
  const [checkingPermission, setCheckingPermission] = createSignal(true);
  const [modal, setModal] = createSignal<ModalState>({
    show: false,
    type: "info",
    title: "",
    message: ""
  });


  const showModal = (type: ModalState["type"], title: string, message: string, action?: () => void, actionLabel?: string) => {
    setModal({ show: true, type, title, message, action, actionLabel });
  };

  const closeModal = () => {
    setModal({ show: false, type: "info", title: "", message: "" });
  };

  const handleModalAction = () => {
    const currentModal = modal();
    if (currentModal.action) {
      currentModal.action();
    }
    closeModal();
  };


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




  // Load current user
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




  // Check permission
  createEffect(async () => {
    const userId = currentUserId();
    const productId = Number(params.id);



    if (!userId || !productId || isNaN(productId)) {
      setCanComment(false);
      setCheckingPermission(false);
      return;
    }



    console.log("🔍 PRODUCT: Checking permission for User:", userId, "Product:", productId);



    const hasPermission = await checkCommentPermission(userId, productId);
    
    console.log("✅ PRODUCT: Permission Result:", hasPermission);



    setCanComment(hasPermission);
    setCheckingPermission(false);
  });



  // Load product and comments
  createEffect(async () => {
    try {
      setLoading(true);
      const productId = Number(params.id);



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
          product_images (
            id,
            image_url,
            order_index
          )
        `)
        .eq("id", productId)
        .single<ProductDB>();




      if (productError || !productData) throw productError;




      const imagesList: string[] = [];
      if (productData.product_images && productData.product_images.length > 0) {
        const images = productData.product_images
          .sort((a, b) => a.order_index - b.order_index)
          .map((img) => img.image_url);
        imagesList.push(...images);
      }




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
          productData.Product_Tags?.map((pt) => pt.Tags).filter((t): t is { id: number; name: string } => Boolean(t)) ??
          [],
      };




      setProduct(transformedProduct);




      // Load comments
      const { data: messagesData, error: messagesError } = await supabase
        .from("Messages")
        .select(`
          id,
          content,
          stars,
          created_at,
          sender_id,
          sender:User!Messages_sender_id_fkey (
            id,
            name,
            surname,
            picture,
            trustlevel
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
        User: msg.sender || null,
      }));




      setComments(transformedComments);




      // Calculate average stars
      if (transformedComments.length > 0) {
        const validStars = transformedComments
          .filter((c) => c.stars !== null && c.stars !== undefined)
          .map((c) => c.stars!);



        if (validStars.length > 0) {
          const avgStars = validStars.reduce((sum, s) => sum + s, 0) / validStars.length;



          await supabase.from("Product").update({ stars: avgStars }).eq("id", productId);
          setProduct((prev) => (prev ? { ...prev, stars: avgStars } : null));
        }
      }
    } catch (err) {
      console.error("Error loading product:", err);
    } finally {
      setLoading(false);
    }
  });



  // Realtime subscription für neue Kommentare
  let commentChannel: any = null;

  createEffect(() => {
    const productId = Number(params.id);
    if (!productId || isNaN(productId)) return;

    console.log("🔌 Setting up comment subscription for product:", productId);

    // Cleanup old channel
    if (commentChannel) {
      supabase.removeChannel(commentChannel);
    }

    commentChannel = supabase
      .channel('product-comments-' + productId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Messages",
          filter: `product_id=eq.${productId}`
        },
        async (payload) => {
          console.log("🔔 New comment received:", payload.new);

          // Prüfe zuerst ob es ein product comment ist
          if (payload.new.message_type !== "product") {
            console.log("⏭️ Not a product comment, ignoring");
            return;
          }

          // Lade die komplette Message mit User-Daten
          const { data: newComment, error: commentError } = await supabase
            .from("Messages")
            .select(`
              id,
              content,
              stars,
              created_at,
              sender_id,
              message_type,
              sender:User!Messages_sender_id_fkey (
                id,
                name,
                surname,
                picture,
                trustlevel
              )
            `)
            .eq("id", payload.new.id)
            .eq("message_type", "product")
            .maybeSingle();

          if (commentError || !newComment) {
            console.error("❌ Error loading comment:", commentError);
            return;
          }

          console.log("✅ Comment loaded with user data:", newComment);

          // Prüfe ob der Kommentar schon existiert
          const exists = comments().some(c => c.id === newComment.id);
          if (!exists) {
            const transformedComment: Comment = {
              id: newComment.id,
              content: newComment.content,
              stars: newComment.stars,
              created_at: newComment.created_at,
              sender_id: newComment.sender_id,
              User: (newComment as any).sender || null,
            };

            setComments([transformedComment, ...comments()]);
            console.log("📝 Comment added to list");

            // Aktualisiere Durchschnitt
            const updatedComments = [transformedComment, ...comments()];
            const validStars = updatedComments
              .map(c => c.stars)
              .filter((s): s is number => typeof s === "number" && !isNaN(s) && s > 0);

            if (validStars.length > 0) {
              const avgStars = validStars.reduce((sum, s) => sum + s, 0) / validStars.length;
              const roundedAvg = Math.round(avgStars * 2) / 2;
              setProduct(prev => prev ? { ...prev, stars: roundedAvg } : null);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("📡 Comment Channel Status:", status);
      });
  });

  onCleanup(() => {
    if (commentChannel) {
      supabase.removeChannel(commentChannel);
      console.log("🧹 Comment channel cleaned up");
    }
  });



 const handleRequestTest = async () => {
  if (!isLoggedIn()) {
    navigate("/login");
    return;
  }



  try {
    const userId = currentUserId();
    const prod = product();
    
    if (!userId || !prod) {
      showModal("error", "Fehler", "Daten nicht verfügbar. Bitte lade die Seite neu.");
      return;
    }



    const productId = prod.id;
    const ownerId = prod.owner_id;

    // ✅ Sicherheits-Check mit Modal
    if (userId === ownerId) {
      showModal("warning", "Eigenes Produkt", "Du kannst keine Testanfrage für dein eigenes Produkt stellen.");
      return;
    }



    console.log("🔔 Sende Request als Chat-Nachricht");



    // 1. Prüfe ob bereits ein Request existiert
    const { data: existingRequest } = await supabase
      .from("Messages")
      .select("id, message_type")
      .eq("sender_id", userId)
      .eq("product_id", productId)
      .in("message_type", ["request", "request_accepted"])
      .maybeSingle();



    if (existingRequest) {
      if (existingRequest.message_type === "request_accepted") {
        showModal("info", "Bereits akzeptiert", "Deine Anfrage wurde bereits akzeptiert! Du kannst jetzt kommentieren.");
      } else {
        showModal("info", "Anfrage bereits gesendet", "Du hast bereits eine Anfrage für dieses Produkt gesendet!");
      }
      return;
    }



    // 2. Hole oder erstelle Chat mit dem Owner
    const { data: chatData, error: chatError } = await supabase
      .rpc("get_or_create_direct_chat", {
        user1_id: userId,
        user2_id: ownerId
      });



    if (chatError) {
      console.error("❌ Chat Error:", chatError);
      throw chatError;
    }
    
    const chatId = chatData as number;
    console.log("💬 Chat ID:", chatId);



    // 3. Sende Request als Message
    const requestContent = `Ich möchte gerne dein Produkt "${prod.name}" testen!`;



    console.log("📤 Sending INSERT with data:", {
      content: requestContent,
      sender_id: userId,
      receiver_id: ownerId,
      chat_id: chatId,
      product_id: productId,
      message_type: "request",
      read: false,
    });



    const { data: messageData, error: messageError } = await supabase
      .from("Messages")
      .insert({
        content: requestContent,
        sender_id: userId,
        receiver_id: ownerId,
        chat_id: chatId,
        product_id: productId,
        message_type: "request",
        read: false,
        created_at: new Date().toISOString(),
      });



    if (messageError) {
      console.error("❌ INSERT Error:", messageError);
      console.error("❌ Error Code:", messageError.code);
      console.error("❌ Error Message:", messageError.message);
      console.error("❌ Error Details:", messageError.details);
      console.error("❌ Error Hint:", messageError.hint);
      throw messageError;
    }



    console.log("✅ Request-Nachricht gesendet!");



    // 4. Zeige Success Modal und navigiere
    showModal(
      "success", 
      "Anfrage gesendet", 
      "Deine Anfrage wurde erfolgreich gesendet! Du wirst zum Chat weitergeleitet.",
      () => navigate(`/chat/${ownerId}`),
      "Zum Chat"
    );


  } catch (err: any) {
    console.error("Error sending request:", err);
    showModal("error", "Fehler", `Fehler beim Senden der Anfrage: ${err.message || "Unbekannter Fehler"}`);
  }
};






  const handleContact = () => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }



    const ownerId = product()?.owner_id;
    if (ownerId) navigate(`/chat/${ownerId}`);
  };




  const handleSubmitComment = async (content: string, stars: number) => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }




    const userId = currentUserId();
    const productId = Number(params.id);




    if (!userId || !content.trim()) return;




    try {
      const hasPermission = await checkCommentPermission(userId, productId);




      if (!hasPermission) {
        showModal("warning", "Keine Berechtigung", "Du hast keine Berechtigung, dieses Produkt zu kommentieren.");
        setCanComment(false);
        return;
      }




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
            created_at: new Date().toISOString(),
          })
          .select("id")
          .single();




        if (chatError) throw chatError;
        chatId = newChat.id;
      }




      const insertData: any = {
        content,
        sender_id: userId,
        product_id: productId,
        chat_id: chatId,
        message_type: "product",
        created_at: new Date().toISOString(),
      };




      if (stars > 0) {
        insertData.stars = stars;
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
          sender:User!Messages_sender_id_fkey (
            id,
            name,
            surname,
            picture,
            trustlevel
          )
        `)
        .single();




      if (error) {
        if (error.code === "42501" || error.message.includes("policy")) {
          showModal("warning", "Keine Berechtigung", "Du hast keine Berechtigung, dieses Produkt zu kommentieren.");
          setCanComment(false);
          return;
        }
        throw error;
      }




      if (!data) throw new Error("No data returned from insert");


      // ✅ Warte kurz, Realtime fügt den Comment hinzu
      console.log("✅ Comment submitted, waiting for realtime update...");
      // Der Realtime-Subscription fügt den Kommentar automatisch hinzu


    } catch (err: any) {
      console.error("Error submitting comment:", err);
      showModal("error", "Fehler beim Kommentieren", err.message || "Unbekannter Fehler");
    }
  };


  const getModalIcon = () => {
    const type = modal().type;
    switch (type) {
      case "error":
        return (
          <div class="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case "success":
        return (
          <div class="flex-shrink-0 w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case "warning":
        return (
          <div class="flex-shrink-0 w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      default:
        return (
          <div class="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };



  return (
    <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Universal Modal */}
      <Show when={modal().show}>
        <div 
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div 
            class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md mx-4 transform transition-all duration-200 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div class="flex items-start gap-4">
              {getModalIcon()}
              <div class="flex-1">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {modal().title}
                </h3>
                <p class="text-gray-600 dark:text-gray-300 mb-4">
                  {modal().message}
                </p>
                <div class="flex gap-3">
                  <Show when={modal().action}>
                    <button
                      onClick={handleModalAction}
                      class="flex-1 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-semibold transition-colors"
                    >
                      {modal().actionLabel || "OK"}
                    </button>
                    <button
                      onClick={closeModal}
                      class="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-semibold transition-colors"
                    >
                      Abbrechen
                    </button>
                  </Show>
                  <Show when={!modal().action}>
                    <button
                      onClick={closeModal}
                      class="w-full px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-semibold transition-colors"
                    >
                      Verstanden
                    </button>
                  </Show>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Show>

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
          {/* Product Details - 2 Column Layout */}
          <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden mb-8">
            <div class="grid lg:grid-cols-2 gap-8 p-8">
              {/* Linke Spalte: Image Gallery */}
              <div class="space-y-4">
                <ImageGallery 
                  images={product()!.images} 
                  productName={product()!.name} 
                />
              </div>




              {/* Rechte Spalte: Product Info */}
              <div>
                <ProductInfo
                  product={product()!}
                  commentsCount={comments().filter(c => c.stars !== null).length}
                  currentUserId={currentUserId()}
                  onRequestTest={handleRequestTest}
                  onContact={handleContact}
                />
              </div>
            </div>
          </div>



          <CommentSection
            comments={comments()}
            isLoggedIn={isLoggedIn()}
            canComment={canComment()}
            checkingPermission={checkingPermission()}
            onSubmitComment={handleSubmitComment}
          />
        </main>
      </Show>
    </div>
  );
}
