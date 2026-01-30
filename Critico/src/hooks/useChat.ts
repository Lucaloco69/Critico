import { createSignal, createEffect, onMount, onCleanup } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { supabase } from "../lib/supabaseClient";
import sessionStore, { isLoggedIn } from "../lib/sessionStore";
import QRCode from "qrcode";

export interface Message {
  id: number;
  content: string;
  created_at: string;
  sender_id: number;
  receiver_id?: number;
  read: boolean;
  message_type?: "direct" | "request" | "request_accepted" | "request_declined" | "product";
  product_id?: number;

  qr_data_url?: string | null;

  sender: {
    id: number;
    name: string;
    surname: string;
    picture: string | null;
    trustlevel: any;
  };
}

export type ChatPartner = {
  id: number;
  name: string;
  surname: string;
  picture: string | null;
  trustlevel: number | null;
};

let globalChannel: any = null;
let globalChatId: number | null = null;

export function useChat() {
  const params = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = createSignal<Message[]>([]);
  const [newMessage, setNewMessage] = createSignal("");
  const [chatPartner, setChatPartner] = createSignal<ChatPartner | null>(null);
  const [currentUserId, setCurrentUserId] = createSignal<number | null>(null);
  const [chatId, setChatId] = createSignal<number | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [sending, setSending] = createSignal(false);

  // NEW: Owner cache pro product_id
  const [productOwnerMap, setProductOwnerMap] = createSignal<Record<number, number>>({});

  const getProductOwnerId = (productId?: number) => {
    if (productId == null) return null;
    return productOwnerMap()[productId] ?? null;
  };

  const ensureProductOwnerLoaded = async (productId?: number) => {
    if (productId == null) return;
    if (productOwnerMap()[productId] != null) return;

    const { data, error } = await supabase
      .from("Product")
      .select("owner_id")
      .eq("id", productId)
      .single();

    if (!error && data?.owner_id != null) {
      setProductOwnerMap((prev) => ({ ...prev, [productId]: data.owner_id }));
    }
  };

  let mainContainerRef: HTMLElement | undefined;
  const setMainContainerRef = (el: HTMLElement | undefined) => {
    mainContainerRef = el;
  };

  const scrollToBottom = () => {
    if (mainContainerRef) mainContainerRef.scrollTop = mainContainerRef.scrollHeight;
  };

  createEffect(() => {
    if (!loading() && messages().length > 0) {
      setTimeout(() => scrollToBottom(), 0);
      setTimeout(() => scrollToBottom(), 100);
      setTimeout(() => scrollToBottom(), 300);
    }
  });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  };

  const makeQrDataUrl = async (value: string) => {
    return QRCode.toDataURL(value, { errorCorrectionLevel: "M", margin: 2, width: 240 });
  };

  const loadMessages = async (directChatId: number, userId: number) => {
    const { data, error } = await supabase
      .from("Messages")
      .select(
        `
        id,
        content,
        created_at,
        sender_id,
        receiver_id,
        read,
        message_type,
        product_id,
        sender:User!Messages_sender_id_fkey (
          id,
          name,
          surname,
          picture,
          trustlevel
        )
      `
      )
      .eq("chat_id", directChatId)
      .in("message_type", ["direct", "request", "request_accepted", "request_declined"])
      .order("created_at", { ascending: true })
      .returns<Message[]>();

    if (error) {
      console.error("❌ Error loading messages:", error);
      return;
    }

    // Owner-IDs für alle product_id in diesem Chat vorladen (deduped)
    const productIds = Array.from(new Set((data ?? []).map((m) => m.product_id).filter(Boolean) as number[]));
    await Promise.all(productIds.map((pid) => ensureProductOwnerLoaded(pid)));

    const enriched: Message[] = [];
    for (const m of data ?? []) {
      if (m.message_type === "request_accepted" && m.content?.startsWith("http")) {
        try {
          const qr = await makeQrDataUrl(m.content);
          enriched.push({ ...m, qr_data_url: qr });
        } catch {
          enriched.push({ ...m, qr_data_url: null });
        }
      } else {
        enriched.push({ ...m, qr_data_url: null });
      }
    }

    setMessages(enriched);
    queueMicrotask(scrollToBottom);
  };

  onMount(async () => {
    if (!isLoggedIn() || !sessionStore.user) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);

      const { data: userData, error: userError } = await supabase
        .from("User")
        .select("id")
        .eq("auth_id", sessionStore.user.id)
        .single();

      if (userError) throw userError;
      if (!userData) return;

      const userId = userData.id;
      setCurrentUserId(userId);

      const partnerId = Number(params.partnerId);
      if (!partnerId) return;

      const { data: partnerData } = await supabase
        .from("User")
        .select("id, name, surname, picture, trustlevel")
        .eq("id", partnerId)
        .single();

      if (partnerData) setChatPartner(partnerData);

      const { data: chatData, error: chatError } = await supabase.rpc("get_or_create_direct_chat", {
        user1_id: userId,
        user2_id: partnerId,
      });

      if (chatError) throw chatError;

      const directChatId = chatData as number;
      setChatId(directChatId);

      await loadMessages(directChatId, userId);

      if (globalChannel && globalChatId === directChatId) return;

      if (globalChannel) {
        await supabase.removeChannel(globalChannel);
        globalChannel = null;
      }

      globalChannel = supabase
        .channel("any-messages-" + Date.now())
        .on("postgres_changes", { event: "*", schema: "public", table: "Messages" }, (payload) => {
          if (payload.eventType === "INSERT") {
            const validTypes = ["direct", "request", "request_accepted", "request_declined"];
            if (payload.new.chat_id === directChatId && validTypes.includes(payload.new.message_type)) {
              if (payload.new.sender_id === userId) return;

              supabase
                .from("Messages")
                .select(
                  `
                  id,
                  content,
                  created_at,
                  sender_id,
                  receiver_id,
                  read,
                  message_type,
                  product_id,
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
                .single<Message>()
                .then(async ({ data: newMsg, error }) => {
                  if (error || !newMsg) return;

                  await ensureProductOwnerLoaded(newMsg.product_id);

                  let qr_data_url: string | null = null;
                  if (newMsg.message_type === "request_accepted" && newMsg.content?.startsWith("http")) {
                    try {
                      qr_data_url = await makeQrDataUrl(newMsg.content);
                    } catch {
                      qr_data_url = null;
                    }
                  }

                  setMessages((prev) => [...prev, { ...newMsg, qr_data_url }]);
                });
            }
          }

          if (payload.eventType === "UPDATE") {
            if (payload.new.chat_id === directChatId) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === payload.new.id
                    ? { ...msg, message_type: payload.new.message_type, read: payload.new.read }
                    : msg
                )
              );
            }
          }
        })
        .subscribe();

      globalChatId = directChatId;
    } catch (err) {
      console.error("Error loading chat:", err);
    } finally {
      setLoading(false);
    }
  });

  onCleanup(() => {
    console.log("🧹 Cleanup aufgerufen - Component wird unmounted");
  });

  const handleSendMessage = async (e: Event) => {
    e.preventDefault();
    if (!newMessage().trim() || !currentUserId() || !chatId()) return;

    setSending(true);

    try {
      const partnerId = Number(params.partnerId);

      const { data, error } = await supabase
        .from("Messages")
        .insert({
          content: newMessage(),
          sender_id: currentUserId()!,
          receiver_id: partnerId,
          chat_id: chatId()!,
          message_type: "direct",
          read: false,
          created_at: new Date().toISOString(),
        })
        .select(
          `
          id,
          content,
          created_at,
          sender_id,
          receiver_id,
          read,
          message_type,
          product_id,
          sender:User!Messages_sender_id_fkey (
            id,
            name,
            surname,
            picture,
            trustlevel
          )
        `
        )
        .single<Message>();

      if (error) throw error;

      if (data) {
        setMessages((prev) => [...prev, { ...data, qr_data_url: null }]);
        setNewMessage("");
        queueMicrotask(scrollToBottom);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Fehler beim Senden der Nachricht");
    } finally {
      setSending(false);
    }
  };

  const handleAcceptRequest = async (messageId: number, senderId: number, productId: number) => {
    const ownerId = currentUserId();
    const activeChatId = chatId();

    if (!ownerId || !activeChatId) {
      alert("Chat/User nicht bereit");
      return;
    }

    try {
      const { data, error } = await supabase.rpc("accept_test_request", {
        p_message_id: messageId,
        p_product_id: productId,
        p_tester_user_id: senderId,
        p_chat_id: activeChatId,
      });

      if (error) throw error;

      const token = Array.isArray(data) ? String((data[0] as any)?.token ?? "") : String((data as any)?.token ?? "");
      const qrValue = token ? `${window.location.origin}/activate/${token}` : "";

      if (!qrValue || !qrValue.startsWith("http")) throw new Error("QR-Link wurde nicht erzeugt");

      // Request-Message lokal auf accepted setzen (Status bleibt sichtbar)
      setMessages((prev) =>
  prev.map((msg) =>
    msg.id === messageId ? { ...msg, message_type: "request_accepted", read: true } : msg
  )
);


      // Owner-self QR-Link message
      const { data: qrMsg, error: qrInsertError } = await supabase
        .from("Messages")
        .insert({
          content: qrValue,
          sender_id: ownerId,
          receiver_id: ownerId,
          chat_id: activeChatId,
          product_id: productId,
          message_type: "request_accepted",
          read: false,
          created_at: new Date().toISOString(),
        })
        .select(
          `
          id,
          content,
          created_at,
          sender_id,
          receiver_id,
          read,
          message_type,
          product_id,
          sender:User!Messages_sender_id_fkey (
            id,
            name,
            surname,
            picture,
            trustlevel
          )
        `
        )
        .single<Message>();

      if (qrInsertError) throw qrInsertError;

      let qr_data_url: string | null = null;
      try {
        qr_data_url = await makeQrDataUrl(qrMsg.content);
      } catch {
        qr_data_url = null;
      }

      setMessages((prev) => [...prev, { ...qrMsg, qr_data_url }]);
      queueMicrotask(scrollToBottom);
    } catch (err: any) {
      console.error("❌ Error accepting request:", err);
      alert(`Fehler beim Akzeptieren: ${err?.message ?? "Unbekannt"}`);
    }
  };

  const handleDeclineRequest = async (messageId: number) => {
    try {
      const { error } = await supabase
        .from("Messages")
        .update({ message_type: "request_declined", read: true })
        .eq("id", messageId);

      if (error) throw error;

      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, message_type: "request_declined", read: true } : msg))
      );
    } catch (err) {
      console.error("Error declining request:", err);
      alert("Fehler beim Ablehnen der Anfrage.");
    }
  };

  return {
    messages,
    newMessage,
    setNewMessage,
    chatPartner,
    currentUserId,
    loading,
    sending,
    handleSendMessage,
    handleAcceptRequest,
    handleDeclineRequest,
    formatTime,
    setMainContainerRef,

    // NEW:
    getProductOwnerId,
  };
}
