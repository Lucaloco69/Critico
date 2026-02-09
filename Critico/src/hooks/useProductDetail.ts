// src/hooks/useProductDetail.ts
import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { supabase } from "../lib/supabaseClient";
import sessionStore, { isLoggedIn } from "../lib/sessionStore";
import type { Comment, Product } from "../types/product";

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
  name: "Unbekannt",
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
    actionLabel?: string,
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
    const images =
      db.product_images?.length
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
      setCanComment(ok);
      setCheckingPermission(false);
    })();
  });

  // Load product + comments
  createEffect(() => {
    const pid = productId();
    if (!pid || Number.isNaN(pid)) return;

    setLoading(true);

    (async () => {
      try {
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
            `,
          )
          .eq("id", pid)
          .single<ProductDB>();

        if (productError || !productData) throw productError;
        setProduct(transformProduct(productData));

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
            `,
          )
          .eq("product_id", pid)
          .eq("message_type", "product")
          .order("created_at", { ascending: true });

        const list = ((messagesData as MessageRow[] | null) ?? []).map(toComment);
        setComments(list);

        const avg = computeAvgStars(list);
        if (avg != null) {
          await supabase.from("Product").update({ stars: avg }).eq("id", pid);
          setProduct((prev) => (prev ? { ...prev, stars: avg } : null));
        }
      } catch (err) {
        console.error("Error loading product:", err);
      } finally {
        setLoading(false);
      }
    })();
  });

  // Realtime comments
  createEffect(() => {
    const pid = productId();
    if (!pid || Number.isNaN(pid)) return;

    const channel = supabase
      .channel("product-comments-" + pid)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Messages", filter: `product_id=eq.${pid}` },
        (payload: any) => {
          if (payload.new?.message_type !== "product") return;

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
                `,
              )
              .eq("id", payload.new.id)
              .eq("message_type", "product")
              .maybeSingle<MessageRow>();

            if (error || !row) return;

            setComments((prev) => {
              if (prev.some((c) => c.id === row.id)) return prev;
              const next = [toComment(row), ...prev];

              const avg = computeAvgStars(next);
              if (avg != null) {
                const rounded = Math.round(avg * 2) / 2;
                setProduct((p) => (p ? { ...p, stars: rounded } : null));
              }
              return next;
            });
          })();
        },
      )
      .subscribe();

    onCleanup(() => {
      supabase.removeChannel(channel);
    });
  });

  // Actions
  const handleRequestTest = async () => {
    if (!isLoggedIn()) return navigate("/login");

    const uid = currentUserId();
    const prod = product();

    if (typeof uid !== "number" || !prod) {
      showModal("info", "Einen Moment", "Dein Konto oder das Produkt wird noch geladen. Bitte versuche es gleich nochmal.");
      return;
    }

    if (uid === prod.owner_id) {
      showModal("warning", "Eigenes Produkt", "Du kannst keine Testanfrage für dein eigenes Produkt stellen.");
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
          existingRequest.message_type === "request_accepted" ? "Bereits akzeptiert" : "Anfrage bereits gesendet",
          existingRequest.message_type === "request_accepted"
            ? "Deine Anfrage wurde bereits akzeptiert! Du kannst jetzt kommentieren."
            : "Du hast bereits eine Anfrage für dieses Produkt gesendet!",
        );
        return;
      }

      const { data: chatData, error: chatError } = await supabase.rpc("get_or_create_direct_chat", {
        user1_id: uid,
        user2_id: ownerId,
      });
      if (chatError) throw chatError;

      const chatId = chatData as number;
      const requestContent = `Ich möchte gerne dein Produkt "${prod.name}" testen!`;

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
        "Anfrage gesendet",
        "Deine Anfrage wurde erfolgreich gesendet! Du wirst zum Chat weitergeleitet.",
        () => navigate(`/chat/${ownerId}`),
        "Zum Chat",
      );
    } catch (err: any) {
      console.error("Error sending request:", err);
      showModal("error", "Fehler", `Fehler beim Senden der Anfrage: ${err.message || "Unbekannter Fehler"}`);
    }
  };

  const handleContact = () => {
    if (!isLoggedIn()) return navigate("/login");
    const ownerId = product()?.owner_id;
    if (ownerId) navigate(`/chat/${ownerId}`);
  };

  const handleSubmitComment = async (content: string, stars: number) => {
    if (!isLoggedIn()) return navigate("/login");

    const uid = currentUserId();
    const pid = productId();
    if (typeof uid !== "number" || !content.trim() || Number.isNaN(pid)) return;

    try {
      const ok = await checkCommentPermission(uid, pid);
      if (!ok) {
        showModal("warning", "Keine Berechtigung", "Du hast keine Berechtigung, dieses Produkt zu kommentieren.");
        setCanComment(false);
        return;
      }

      const { data: existingChat } = await supabase.from("Chats").select("id").eq("product_id", pid).maybeSingle();

      let chatId: number;
      if (existingChat) {
        chatId = existingChat.id;
      } else {
        const { data: newChat, error: chatError } = await supabase
          .from("Chats")
          .insert({ product_id: pid, created_at: new Date().toISOString() })
          .select("id")
          .single();

        if (chatError) throw chatError;
        chatId = newChat.id;
      }

      const insertData: Record<string, unknown> = {
        content,
        sender_id: uid,
        product_id: pid,
        chat_id: chatId,
        message_type: "product",
        created_at: new Date().toISOString(),
      };
      if (stars > 0) insertData.stars = stars;

      const { error } = await supabase.from("Messages").insert(insertData);

      if (error) {
        if (error.code === "42501" || error.message.includes("policy")) {
          showModal("warning", "Keine Berechtigung", "Du hast keine Berechtigung, dieses Produkt zu kommentieren.");
          setCanComment(false);
          return;
        }
        throw error;
      }
    } catch (err: any) {
      console.error("Error submitting comment:", err);
      showModal("error", "Fehler beim Kommentieren", err.message || "Unbekannter Fehler");
    }
  };

  return {
    // state
    product,
    comments,
    loading,
    currentUserId,
    canComment,
    checkingPermission,
    modal,

    // modal helpers
    showModal,
    closeModal,
    handleModalAction,

    // actions
    handleRequestTest,
    handleContact,
    handleSubmitComment,
  };
}
