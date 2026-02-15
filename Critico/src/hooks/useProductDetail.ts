import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { supabase } from "../lib/supabaseClient";
import sessionStore, { isLoggedIn } from "../lib/sessionStore";
import type { Comment, Product } from "../types/product";
import { t } from "../lib/i18n";

interface ProductDB {
  id: number;
  name: string;
  beschreibung: string;
  price: number | null;
  owner_id: number;
  stars: number;
  User: Product["User"];
  Product_Tags?: { Tags: { id: number; name: string } | null }[];
  product_images?: { id: number; image_url: string; order_index: number }[];
}

export interface ModalState {
  show: boolean;
  type: "error" | "success" | "warning" | "info";
  title: string;
  message: string;
  action?: () => void;
  actionLabel?: string;
}

type MessageRow = {
  id: number;
  content: string;
  stars: number | null;
  created_at: string;
  sender_id: number;
  message_type?: string;
  sender: Comment["User"] | null;
};

const emptyModal: ModalState = { show: false, type: "info", title: "", message: "" };

const unknownUser = (senderId: number): Comment["User"] => ({
  id: senderId,
  name: t("productDetail.unknownUserName"),
  surname: "",
  picture: null,
  trustlevel: null,
});

export function useProductDetail(productId: () => number, navigate: (to: any) => void) {
  const [product, setProduct] = createSignal<Product | null>(null);
  const [comments, setComments] = createSignal<Comment[]>([]);
  const [loading, setLoading] = createSignal(true);

  const currentUserId = createMemo<number | null>(() => sessionStore.userId);

  const [canComment, setCanComment] = createSignal(false);
  const [checkingPermission, setCheckingPermission] = createSignal(true);

  const [modal, setModal] = createSignal<ModalState>(emptyModal);

  const showModal = (
    type: ModalState["type"],
    title: string,
    message: string,
    action?: () => void,
    actionLabel?: string
  ) => setModal({ show: true, type, title, message, action, actionLabel });

  const closeModal = () => setModal(emptyModal);

  const handleModalAction = () => {
    const m = modal();
    if (m.action) m.action();
    closeModal();
  };

  const checkCommentPermission = async (userId: number, pid: number): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("ProductComments_User")
        .select("user_id")
        .eq("user_id", userId)
        .eq("product_id", pid)
        .maybeSingle();

      if (error) return false;
      return !!data;
    } catch {
      return false;
    }
  };

  const transformProduct = (db: ProductDB): Product => {
    const images = db.product_images?.length
      ? [...db.product_images].sort((a, b) => a.order_index - b.order_index).map((i) => i.image_url)
      : [];

    return {
      id: db.id,
      name: db.name,
      beschreibung: db.beschreibung,
      price: db.price,
      picture: images[0] || null,
      images,
      owner_id: db.owner_id,
      stars: db.stars || 0,
      User: db.User,
      tags: db.Product_Tags?.map((pt) => pt.Tags).filter((t): t is { id: number; name: string } => !!t) ?? [],
    };
  };

  const toComment = (msg: MessageRow): Comment => ({
    id: msg.id,
    content: msg.content,
    stars: msg.stars,
    created_at: msg.created_at,
    sender_id: msg.sender_id,
    User: msg.sender ?? unknownUser(msg.sender_id),
  });

  const computeAvgStars = (list: Comment[]) => {
    const valid = list
      .map((c) => c.stars)
      .filter((s): s is number => typeof s === "number" && !Number.isNaN(s) && s > 0);

    if (!valid.length) return null;
    return valid.reduce((sum, s) => sum + s, 0) / valid.length;
  };

  const loadProduct = async (pid: number) => {
    try {
      console.log("🔄 PRODUCT DETAIL: Loading product", pid);

      const { data: productData, error: productError } = await supabase
        .from("Product")
        .select(
          `
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
              picture,
              trustlevel
            ),
            Product_Tags (
              Tags ( id, name )
            ),
            product_images ( id, image_url, order_index )
          `
        )
        .eq("id", pid)
        .single<ProductDB>();

      if (productError || !productData) throw productError;

      const transformed = transformProduct(productData);
      console.log("✅ PRODUCT DETAIL: Product loaded, stars:", transformed.stars);

      setProduct(transformed);
    } catch (err) {
      console.error("Error loading product:", err);
    }
  };

  const loadComments = async (pid: number) => {
    try {
      console.log("🔄 PRODUCT DETAIL: Loading comments for product", pid);

      const { data: messagesData } = await supabase
        .from("Messages")
        .select(
          `
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
          `
        )
        .eq("product_id", pid)
        .eq("message_type", "product")
        .order("created_at", { ascending: true });

      const list = ((messagesData as MessageRow[] | null) ?? []).map(toComment);
      console.log("✅ PRODUCT DETAIL: Comments loaded:", list.length);

      setComments(list);

      const avg = computeAvgStars(list);
      console.log("📊 PRODUCT DETAIL: Computed average stars:", avg);

      if (avg != null) {
        await supabase.from("Product").update({ stars: avg }).eq("id", pid);

        setProduct((prev) => {
          if (!prev) return null;
          console.log("🌟 PRODUCT DETAIL: Updating product stars:", prev.stars, "→", avg);
          return { ...prev, stars: avg };
        });
      }
    } catch (err) {
      console.error("Error loading comments:", err);
    }
  };

  // Permission effect
  createEffect(() => {
    const uid = currentUserId();
    const pid = productId();

    setCheckingPermission(true);

    if (typeof uid !== "number" || !pid || Number.isNaN(pid)) {
      setCanComment(false);
      setCheckingPermission(false);
      return;
    }

    (async () => {
      const ok = await checkCommentPermission(uid, pid);
      console.log("🔐 Permission check result:", ok);
      setCanComment(ok);
      setCheckingPermission(false);
    })();
  });

  // Load product + comments (initial)
  createEffect(() => {
    const pid = productId();
    if (!pid || Number.isNaN(pid)) return;

    setLoading(true);

    (async () => {
      await loadProduct(pid);
      await loadComments(pid);
      setLoading(false);
    })();
  });

  // ✅ Realtime comments
  createEffect(() => {
    const pid = productId();
    if (!pid || Number.isNaN(pid)) return;

    let channel: any = null;
    let retryTimeout: any;

    const setupChannel = () => {
      // Clean up previous channel if exists
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }

      console.log("🔄 REALTIME: Setting up channel for product", pid);

      channel = supabase
        .channel("product-comments-" + pid)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "Messages",
            filter: `product_id=eq.${pid}`,
          },
          (payload: any) => {
            if (payload.new?.message_type !== "product") return;

            console.log("🔔 REALTIME: New comment received", payload.new.id);

            (async () => {
              const { data: row, error } = await supabase
                .from("Messages")
                .select(
                  `
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
                  `
                )
                .eq("id", payload.new.id)
                .eq("message_type", "product")
                .maybeSingle<MessageRow>();

              if (error || !row) {
                console.error("❌ REALTIME: Error fetching comment:", error);
                return;
              }

              setComments((prev) => {
                if (prev.some((c) => c.id === row.id)) {
                  console.log("⚠️ REALTIME: Comment already exists, skipping");
                  return prev;
                }

                const next = [...prev, toComment(row)];
                console.log("✅ REALTIME: Comment added, total:", next.length);

                const avg = computeAvgStars(next);
                if (avg != null) {
                  const rounded = Math.round(avg * 2) / 2;
                  console.log("🌟 REALTIME: Updating stars to", rounded);

                  supabase.from("Product").update({ stars: rounded }).eq("id", pid);
                  setProduct((p) => (p ? { ...p, stars: rounded } : null));
                }

                return next;
              });
            })();
          }
        )
        .subscribe((status) => {
          console.log("📡 REALTIME: Channel status:", status);

          if (status === "SUBSCRIBED") {
            console.log("✅ REALTIME: Successfully subscribed to product", pid);
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.error(`❌ REALTIME: Channel failed (${status}). Retrying in 5s...`);
            if (channel) {
              supabase.removeChannel(channel);
              channel = null;
            }
            retryTimeout = setTimeout(setupChannel, 5000);
          }
        });
    };

    setupChannel();

    onCleanup(() => {
      console.log("🧹 REALTIME: Cleaning up channel for product", pid);
      if (retryTimeout) clearTimeout(retryTimeout);
      if (channel) supabase.removeChannel(channel);
    });
  });

  // Actions
  const handleRequestTest = async () => {
    if (!isLoggedIn()) return navigate("/login");

    const uid = currentUserId();
    const prod = product();

    if (typeof uid !== "number" || !prod) {
      showModal("info", t("productDetail.modal.oneMomentTitle"), t("productDetail.modal.oneMomentText"));
      return;
    }

    if (uid === prod.owner_id) {
      showModal("warning", t("productDetail.modal.ownProductTitle"), t("productDetail.modal.ownProductText"));
      return;
    }

    try {
      const pid = prod.id;
      const ownerId = prod.owner_id;

      const { data: existingRequest } = await supabase
        .from("Messages")
        .select("id, message_type")
        .eq("sender_id", uid)
        .eq("product_id", pid)
        .in("message_type", ["request", "request_accepted"])
        .maybeSingle();

      if (existingRequest) {
        showModal(
          "info",
          existingRequest.message_type === "request_accepted"
            ? t("productDetail.modal.alreadyAcceptedTitle")
            : t("productDetail.modal.requestAlreadySentTitle"),
          existingRequest.message_type === "request_accepted"
            ? t("productDetail.modal.alreadyAcceptedText")
            : t("productDetail.modal.requestAlreadySentText")
        );
        return;
      }

      const { data: chatData, error: chatError } = await supabase.rpc("get_or_create_direct_chat", {
        user1_id: uid,
        user2_id: ownerId,
      });
      if (chatError) throw chatError;

      const chatId = chatData as number;
      const requestContent = t("productDetail.requestContent", { name: prod.name });

      const { error: messageError } = await supabase.from("Messages").insert({
        content: requestContent,
        sender_id: uid,
        receiver_id: ownerId,
        chat_id: chatId,
        product_id: pid,
        message_type: "request",
        read: false,
        created_at: new Date().toISOString(),
      });
      if (messageError) throw messageError;

      showModal(
        "success",
        t("productDetail.modal.requestSentTitle"),
        t("productDetail.modal.requestSentText"),
        () => navigate(`/chat/${ownerId}`),
        t("productDetail.modal.toChat")
      );
    } catch (err: any) {
      console.error("Error sending request:", err);
      showModal(
        "error",
        t("productDetail.modal.requestSendErrorTitle"),
        t("productDetail.modal.requestSendErrorText", {
          msg: err?.message || t("productDetail.modal.unknownError"),
        })
      );
    }
  };

  const handleContact = () => {
    if (!isLoggedIn()) return navigate("/login");
    const ownerId = product()?.owner_id;
    if (ownerId) navigate(`/chat/${ownerId}`);
  };

  const handleSubmitComment = async (content: string, stars: number) => {
    console.log("💬 SUBMIT COMMENT: Starting...");
    console.log("💬 Content:", content);
    console.log("⭐ Stars:", stars);

    if (!isLoggedIn()) return navigate("/login");

    const uid = currentUserId();
    const pid = productId();

    console.log("👤 User ID:", uid);
    console.log("📦 Product ID:", pid);

    if (typeof uid !== "number" || !content.trim() || Number.isNaN(pid)) {
      console.error("❌ Invalid data:", { uid, content, pid });
      return;
    }

    try {
      // Permission check
      console.log("🔐 Checking comment permission...");
      const ok = await checkCommentPermission(uid, pid);
      console.log("🔐 Permission result:", ok);

      if (!ok) {
        showModal("warning", t("productDetail.modal.noPermissionTitle"), t("productDetail.modal.noPermissionText"));
        setCanComment(false);
        return;
      }

      // Chat check/create
      console.log("💬 Checking for existing chat...");
      const { data: existingChat, error: chatSelectError } = await supabase
        .from("Chats")
        .select("id")
        .eq("product_id", pid)
        .maybeSingle();

      if (chatSelectError) {
        console.error("❌ CHAT SELECT ERROR:", chatSelectError);
        throw chatSelectError;
      }

      let chatId: number;
      if (existingChat) {
        chatId = existingChat.id;
        console.log("✅ Using existing chat:", chatId);
      } else {
        console.log("📝 Creating new chat...");
        const { data: newChat, error: chatError } = await supabase
          .from("Chats")
          .insert({ product_id: pid, created_at: new Date().toISOString() })
          .select("id")
          .single();

        if (chatError) {
          console.error("❌ CHAT CREATE ERROR:", chatError);
          throw chatError;
        }
        chatId = newChat.id;
        console.log("✅ Created new chat:", chatId);
      }

      // Build insert data
      const insertData: Record<string, unknown> = {
        content,
        sender_id: uid,
        product_id: pid,
        chat_id: chatId,
        message_type: "product",
        created_at: new Date().toISOString(),
      };
      if (stars > 0) insertData.stars = stars;

      console.log("📤 Inserting message:", insertData);

      // Insert message
      const { error: insertError, data: insertedData } = await supabase
        .from("Messages")
        .insert(insertData)
        .select();

      if (insertError) {
        console.error("❌ INSERT ERROR:", insertError);
        console.error("❌ Error code:", insertError.code);
        console.error("❌ Error message:", insertError.message);
        console.error("❌ Error details:", insertError.details);

        if (insertError.code === "42501" || insertError.message.includes("policy")) {
          showModal("warning", t("productDetail.modal.noPermissionTitle"), t("productDetail.modal.noPermissionText"));
          setCanComment(false);
          return;
        }
        throw insertError;
      }

      console.log("✅ Comment inserted successfully!");
      console.log("✅ Inserted data:", insertedData);

      // Reload comments manually
      await loadComments(pid);
    } catch (err: any) {
      console.error("❌ SUBMIT COMMENT ERROR:", err);
      showModal(
        "error",
        t("productDetail.modal.commentErrorTitle"),
        err?.message || t("productDetail.modal.unknownError")
      );
    }
  };

  return {
    product,
    comments,
    loading,
    currentUserId,
    canComment,
    checkingPermission,
    modal,
    showModal,
    closeModal,
    handleModalAction,
    handleRequestTest,
    handleContact,
    handleSubmitComment,
  };
}
