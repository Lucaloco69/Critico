import { createSignal, createEffect, Show } from "solid-js";
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

export default function ProductDetail() {
  const params = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = createSignal<Product | null>(null);
  const [comments, setComments] = createSignal<Comment[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [currentUserId, setCurrentUserId] = createSignal<number | null>(null);
  const [canComment, setCanComment] = createSignal<boolean>(false);
  const [checkingPermission, setCheckingPermission] = createSignal(true);

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

    const hasPermission = await checkCommentPermission(userId, productId);
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

      // ✅ Load comments WITH correct sender + trustlevel
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

      if (messagesError) console.error("Error loading messages:", messagesError);

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

      const { error } = await supabase.from("Requests").insert({
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
        alert("Du hast keine Berechtigung, dieses Produkt zu kommentieren.");
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

      if (stars > 0) insertData.stars = stars;

      // ✅ Insert + return WITH correct sender + trustlevel
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
          alert("Du hast keine Berechtigung, dieses Produkt zu kommentieren.");
          setCanComment(false);
          return;
        }
        throw error;
      }

      if (!data) throw new Error("No data returned from insert");

      const newComment: Comment = {
        id: (data as any).id,
        content: (data as any).content,
        stars: (data as any).stars,
        created_at: (data as any).created_at,
        sender_id: (data as any).sender_id,
        User: (data as any).sender || null,
      };

      const updatedComments = [newComment, ...comments()];
      setComments(updatedComments);

      const validStars = updatedComments
        .map((c) => c.stars)
        .filter((s): s is number => typeof s === "number" && !isNaN(s) && s > 0);

      if (validStars.length > 0) {
        const avgStars = validStars.reduce((sum, s) => sum + s, 0) / validStars.length;
        const roundedAvg = Math.round(avgStars * 2) / 2;

        const { error: updateError } = await supabase
          .from("Product")
          .update({ stars: roundedAvg })
          .eq("id", productId);

        if (!updateError) setProduct((prev) => (prev ? { ...prev, stars: roundedAvg } : null));
      }
    } catch (err: any) {
      console.error("Error submitting comment:", err);
      alert("Fehler beim Kommentieren: " + (err.message || "Unbekannter Fehler"));
    }
  };

  return (
    <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
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
          <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden mb-8">
            <div class="grid lg:grid-cols-2 gap-8 p-8">
              <div class="space-y-4">
                <ImageGallery images={product()!.images} productName={product()!.name} />
              </div>

              <div>
                <ProductInfo
                  product={product()!}
                  commentsCount={comments().filter((c) => c.stars !== null).length}
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
