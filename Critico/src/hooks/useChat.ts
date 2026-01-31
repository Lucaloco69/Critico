import { createSignal, createEffect, onMount, onCleanup } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { supabase } from "../lib/supabaseClient";
import sessionStore, { isLoggedIn } from "../lib/sessionStore";

export interface Message {
  id: number;
  content: string;
  created_at: string;
  sender_id: number;
  receiver_id?: number;
  read: boolean;
  message_type?:
    | "direct"
    | "request"
    | "request_qr_ready"
    | "request_accepted"
    | "request_declined"
    | "product";
  product_id?: number;

  // embedded join
  product?: { id: number; owner_id: number } | null;

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

  // optional (z.B. Header)
  const [productOwnerId, setProductOwnerId] = createSignal<number | null>(null);

  let mainContainerRef: HTMLElement | undefined;
  const setMainContainerRef = (el: HTMLElement | undefined) => {
    mainContainerRef = el;
  };

  const scrollToBottom = () => {
    if (mainContainerRef) mainContainerRef.scrollTop = mainContainerRef.scrollHeight;
  };

  const validTypes = ["direct", "request", "request_qr_ready", "request_accepted", "request_declined"];

  const messageSelect = `
    id,
    content,
    created_at,
    sender_id,
    receiver_id,
    read,
    message_type,
    product_id,
    product:Product ( id, owner_id ),
    sender:User!Messages_sender_id_fkey (
      id, name, surname, picture, trustlevel
    )
  `;

  createEffect(() => {
    const msgs = messages();
    const isLoading = loading();

    console.log("🔄 createEffect triggered - Messages:", msgs.length, "Loading:", isLoading);

    if (!isLoading && msgs.length > 0) {
      setTimeout(() => scrollToBottom(), 0);
      setTimeout(() => scrollToBottom(), 100);
      setTimeout(() => scrollToBottom(), 300);
    }
  });

  createEffect(() => {
    const ids = Array.from(
      new Set(messages().map((m) => m.product_id).filter((x): x is number => typeof x === "number"))
    );
    if (ids.length > 1) {
      console.log("🧩 Chat enthält mehrere product_id (erlaubt):", { chatId: chatId(), productIds: ids });
    }
  });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  };

  const upsertMessageLocal = (msg: Message) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === msg.id);
      if (idx === -1) return [...prev, msg];
      const copy = prev.slice();
      copy[idx] = msg;
      return copy;
    });
  };

  const fetchMessageById = async (id: number) => {
    const { data, error } = await supabase.from("Messages").select(messageSelect).eq("id", id).single<Message>();
    if (error) {
      console.warn("⚠️ fetchMessageById failed:", { id, error });
      return null;
    }
    return data;
  };

  const loadMessages = async (directChatId: number, userId: number) => {
    const { data, error } = await supabase
      .from("Messages")
      .select(messageSelect)
      .eq("chat_id", directChatId)
      .in("message_type", validTypes)
      .order("created_at", { ascending: true })
      .returns<Message[]>();

    if (error) {
      console.error("Error loading messages:", error);
      return;
    }

    setMessages(data ?? []);

    // optional owner for header (latest request-like with product join)
    const req =
      (data || []).find((m) => m.message_type === "request") ||
      (data || []).find((m) => m.message_type === "request_qr_ready") ||
      (data || []).find((m) => m.message_type === "request_accepted" || m.message_type === "request_declined");

    setProductOwnerId(req?.product?.owner_id ?? null);

    queueMicrotask(scrollToBottom);
  };

  onMount(async () => {
    if (!isLoggedIn() || !sessionStore.user) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);

      const { data: userData } = await supabase
        .from("User")
        .select("id")
        .eq("auth_id", sessionStore.user.id)
        .single();

      if (!userData) {
        console.error("User nicht gefunden");
        return;
      }

      const userId = userData.id;
      setCurrentUserId(userId);

      const partnerId = Number(params.partnerId);
      if (!partnerId) {
        console.error("Keine Partner ID");
        return;
      }

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
        .channel(`chat-messages-${directChatId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "Messages",
            filter: `chat_id=eq.${directChatId}`,
          },
          (payload) => {
            console.log("🔔 EVENT EMPFANGEN:", payload.eventType);

            if (payload.eventType === "INSERT") {
              if (!validTypes.includes(payload.new.message_type)) return;
              // optional: eigene Inserts ignorieren
              if (payload.new.sender_id === userId) return;

              fetchMessageById(payload.new.id).then((full) => {
                if (!full) return;
                upsertMessageLocal(full);
              });
            }

            if (payload.eventType === "UPDATE") {
              if (!validTypes.includes(payload.new.message_type)) return;

              // ✅ Wichtig: full reload (damit message_type + product join + sender etc. stimmen)
              fetchMessageById(payload.new.id).then((full) => {
                if (!full) {
                  // fallback: minimal patch
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === payload.new.id ? { ...m, message_type: payload.new.message_type, read: payload.new.read } : m
                    )
                  );
                  return;
                }
                upsertMessageLocal(full);
              });
            }
          }
        )
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
          product_id: null,
          stars: null,
          created_at: new Date().toISOString(),
        })
        .select(messageSelect)
        .single<Message>();

      if (error) throw error;

      if (data) {
        upsertMessageLocal(data);
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

  // ✅ 핵 Fix: lokal sofort auf request_qr_ready umschalten
  const handleAcceptRequest = async (messageId: number, senderId: number, productId: number) => {
    try {
      const ownerId = currentUserId();
      const cId = chatId();
      if (typeof ownerId !== "number") throw new Error("Owner nicht geladen (currentUserId fehlt)");
      if (typeof cId !== "number") throw new Error("chatId fehlt");

      // 1) Token
      const { error: tokenError } = await supabase.from("ProductCommentTokens").insert({
        product_id: productId,
        tester_user_id: senderId,
        owner_user_id: ownerId,
      });

      if (tokenError) throw tokenError;

      // 2) Request-Status updaten
      const { error: updErr } = await supabase
        .from("Messages")
        .update({ message_type: "request_qr_ready", read: true })
        .eq("id", messageId);

      if (updErr) throw updErr;

      // 3) ✅ UI sofort updaten (damit QR sofort rendert)
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, message_type: "request_qr_ready", read: true } : m))
      );

      // 4) optional: full row nachladen (damit product join sicher vorhanden ist)
      const full = await fetchMessageById(messageId);
      if (full) upsertMessageLocal(full);

      // 5) optional: direct info msg (wenn du willst)
      // await supabase.from("Messages").insert({
      //   content: "📦 QR-Code wurde erstellt. Bitte dem Paket beilegen.",
      //   sender_id: ownerId,
      //   receiver_id: senderId,
      //   chat_id: cId,
      //   message_type: "direct",
      //   product_id: null,
      //   stars: null,
      //   read: false,
      //   created_at: new Date().toISOString(),
      // });

    } catch (err) {
      console.error("Error accepting request (QR flow):", err);
      alert("Fehler beim Akzeptieren der Anfrage (QR-Code)");
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
        prev.map((m) => (m.id === messageId ? { ...m, message_type: "request_declined", read: true } : m))
      );

      const full = await fetchMessageById(messageId);
      if (full) upsertMessageLocal(full);
    } catch (err) {
      console.error("Error declining request:", err);
      alert("Fehler beim Ablehnen der Anfrage");
    }
  };

  return {
    messages,
    newMessage,
    setNewMessage,
    chatPartner,
    currentUserId,
    productOwnerId,
    loading,
    sending,
    handleSendMessage,
    handleAcceptRequest,
    handleDeclineRequest,
    formatTime,
    setMainContainerRef,
  };
}
