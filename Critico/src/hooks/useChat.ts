import { createSignal, createEffect, onMount, onCleanup } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { supabase } from "../lib/supabaseClient";
import sessionStore, { isLoggedIn } from "../lib/sessionStore";
import { messagesStore } from "../lib/messagesStore";
import { useChatSubscription } from "./useChatSubscription";
import type { Message, ChatPartner } from "../types/messages";
import { formatChatTime } from "../lib/dateUtils";
import { MESSAGE_TYPES, VALID_CHAT_MESSAGE_TYPES } from "../types/messages";

// Re-export specific types if needed by consumers, but prefer importing from types/messages
export type { Message, ChatPartner } from "../types/messages";



export function useChat() {
  const params = useParams();
  const navigate = useNavigate();

  const { chatMessages: messages } = messagesStore;

  const [newMessage, setNewMessage] = createSignal("");
  const [chatPartner, setChatPartner] = createSignal<ChatPartner | null>(null);
  const [currentUserId, setCurrentUserId] = createSignal<number | null>(null);
  const [chatId, setChatId] = createSignal<number | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [sending, setSending] = createSignal(false);
  const [productOwnerId, setProductOwnerId] = createSignal<number | null>(null);



  useChatSubscription(chatId, currentUserId);

  let mainContainerRef: HTMLElement | undefined;
  const setMainContainerRef = (el: HTMLElement | undefined) => {
    mainContainerRef = el;
  };

  const scrollToBottom = () => {
    if (mainContainerRef) {
      mainContainerRef.scrollTop = mainContainerRef.scrollHeight;
    }
  };

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

    if (!isLoading && msgs.length > 0) {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  });

  const loadMessages = async (directChatId: number, userId: number) => {
    const { data, error } = await supabase
      .from("Messages")
      .select(messageSelect)
      .eq("chat_id", directChatId)
      .in("message_type", VALID_CHAT_MESSAGE_TYPES)
      .order("created_at", { ascending: true })
      .returns<Message[]>();

    if (error) {
      return;
    }

    messagesStore.setChatMessages(data || []);

    const req =
      (data || []).find((m) => m.message_type === MESSAGE_TYPES.REQUEST) ||
      (data || []).find((m) => m.message_type === MESSAGE_TYPES.REQUEST_QR_READY) ||
      (data || []).find((m) => m.message_type === MESSAGE_TYPES.REQUEST_ACCEPTED || m.message_type === MESSAGE_TYPES.REQUEST_DECLINED);

    setProductOwnerId(req?.product?.owner_id ?? null);
  };


  createEffect(async () => {
    const currentUser = sessionStore.user;
    if (!isLoggedIn() || !currentUser || !params.partnerId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data: userData } = await supabase
        .from("User")
        .select("id")
        .eq("auth_id", currentUser.id)
        .single();

      if (!userData) {
        setLoading(false);
        return;
      }

      const userId = userData.id;
      setCurrentUserId(userId);

      const partnerId = Number(params.partnerId);

      if (!partnerId) {
        setLoading(false);
        return;
      }

      const { data: partnerData } = await supabase
        .from("User")
        .select("id, name, surname, picture, trustlevel")
        .eq("id", partnerId)
        .single();

      if (partnerData) {
        setChatPartner(partnerData as ChatPartner);
      }

      const { data: chatData, error: chatError } = await supabase.rpc("get_or_create_direct_chat", {
        user1_id: userId,
        user2_id: partnerId,
      });

      if (chatError) throw chatError;

      const directChatId = chatData as number;
      setChatId(directChatId);

      await loadMessages(directChatId, userId);
      await messagesStore.markChatAsRead(directChatId, userId);

      setLoading(false);

    } catch (err) {
      setLoading(false);
    }
  });

  const handleSendMessage = async (e: Event) => {
    e.preventDefault();

    const messageContent = newMessage().trim();
    const userId = currentUserId();
    const currentChatId = chatId();

    if (!messageContent || !userId || !currentChatId) {
      return;
    }

    setSending(true);
    setNewMessage("");

    const partnerId = Number(params.partnerId);
    const partner = chatPartner();
    const tempId = -Date.now();

    const optimisticMessage: Message = {
      id: tempId,
      content: messageContent,
      created_at: new Date().toISOString(),
      sender_id: userId,
      receiver_id: partnerId,
      read: false,
      message_type: "direct",
      qr_data_url: null,
      product: null,
      sender: partner ? {
        id: userId,
        name: partner.name,
        surname: partner.surname,
        picture: partner.picture,
        trustlevel: partner.trustlevel
      } : {
        id: userId,
        name: "",
        surname: "",
        picture: null
      }
    };

    messagesStore.addMessage(optimisticMessage);
    scrollToBottom();

    try {
      const { data, error } = await supabase
        .from("Messages")
        .insert({
          content: messageContent,
          sender_id: userId,
          receiver_id: partnerId,
          chat_id: currentChatId,
          message_type: "direct",
          read: false,
          created_at: new Date().toISOString(),
        })
        .select(messageSelect)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Keine Daten erhalten");

      const currentMsgs = messages();
      const filtered = currentMsgs.filter(m => m.id !== tempId);
      messagesStore.setChatMessages([...filtered, data as unknown as Message]);

    } catch (err) {
      alert("Fehler beim Senden der Nachricht.");
      const currentMsgs = messages();
      messagesStore.setChatMessages(currentMsgs.filter(m => m.id !== tempId));
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  const handleAcceptRequest = async (messageId: number, senderId: number, productId: number) => {
    try {
      const ownerId = currentUserId();
      if (!ownerId) throw new Error("Owner nicht geladen");

      const { error: tokenError } = await supabase.from("ProductCommentTokens").insert({
        product_id: productId,
        tester_user_id: senderId,
        owner_user_id: ownerId,
      });

      if (tokenError) throw tokenError;

      const { error: updErr } = await supabase
        .from("Messages")
        .update({ message_type: "request_qr_ready", read: true })
        .eq("id", messageId);

      if (updErr) throw updErr;

      messagesStore.updateMessage({ id: messageId, message_type: "request_qr_ready", read: true } as Message);

    } catch (err) {
      alert("Fehler beim Akzeptieren.");
    }
  };

  const handleDeclineRequest = async (messageId: number) => {
    try {
      const { error } = await supabase
        .from("Messages")
        .update({ message_type: "request_declined", read: true })
        .eq("id", messageId);

      if (error) throw error;

      messagesStore.updateMessage({ id: messageId, message_type: "request_declined", read: true } as Message);

    } catch (err) {
      alert("Fehler beim Ablehnen.");
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
    formatTime: formatChatTime,
    setMainContainerRef,
    scrollToBottom,
  };
}
