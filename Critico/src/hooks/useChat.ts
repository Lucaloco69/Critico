import { createSignal, createEffect, onMount, onCleanup } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { supabase } from "../lib/supabaseClient";
import sessionStore, { isLoggedIn } from "../lib/sessionStore";
import { messagesStore } from "../lib/messagesStore";
import { RealtimePostgresChangesPayload, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';

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
  qr_data_url?: string | null;
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

if (typeof window !== 'undefined') {
  (window as any).debugRealtime = true;
}

let globalChannel: any = null;
let globalChatId: number | null = null;

export function useChat() {
  const params = useParams();
  const navigate = useNavigate();

  // ✅ Verwende globalen Store statt lokalem Signal
  const { chatMessages: messages } = messagesStore;
  
  const [newMessage, setNewMessage] = createSignal("");
  const [chatPartner, setChatPartner] = createSignal<ChatPartner | null>(null);
  const [currentUserId, setCurrentUserId] = createSignal<number | null>(null);
  const [chatId, setChatId] = createSignal<number | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [sending, setSending] = createSignal(false);
  const [productOwnerId, setProductOwnerId] = createSignal<number | null>(null);

  console.log("🏗️ useChat: Hook wird initialisiert");

  let mainContainerRef: HTMLElement | undefined;
  const setMainContainerRef = (el: HTMLElement | undefined) => {
    mainContainerRef = el;
  };

  const scrollToBottom = () => {
    if (mainContainerRef) {
      mainContainerRef.scrollTop = mainContainerRef.scrollHeight;
    }
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

    console.log("🔄 useChat.createEffect: Messages:", msgs.length, "Loading:", isLoading);

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
      console.log("🧩 useChat: Mehrere product_id:", { chatId: chatId(), productIds: ids });
    }
  });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  };

  const loadMessages = async (directChatId: number, userId: number) => {
    console.log("📥 useChat.loadMessages START:", { directChatId, userId });
    
    const { data, error } = await supabase
      .from("Messages")
      .select(messageSelect)
      .eq("chat_id", directChatId)
      .in("message_type", validTypes)
      .order("created_at", { ascending: true })
      .returns<Message[]>();

    if (error) {
      console.error("❌ useChat.loadMessages ERROR:", error);
      return;
    }

    console.log("✅ useChat.loadMessages: Loaded", data?.length || 0, "messages");
    
    // ✅ Verwende globalen Store Setter
    const freshMessages = (data || []).map(m => ({ ...m }));
    messagesStore.setChatMessages(freshMessages);
    
    console.log("📊 useChat: Messages gesetzt:", {
      count: freshMessages.length,
      lastId: freshMessages[freshMessages.length - 1]?.id,
      lastContent: freshMessages[freshMessages.length - 1]?.content.substring(0, 30)
    });

    const req =
      (data || []).find((m) => m.message_type === "request") ||
      (data || []).find((m) => m.message_type === "request_qr_ready") ||
      (data || []).find((m) => m.message_type === "request_accepted" || m.message_type === "request_declined");

    setProductOwnerId(req?.product?.owner_id ?? null);

    setTimeout(scrollToBottom, 100);
    setTimeout(scrollToBottom, 300);
    setTimeout(scrollToBottom, 600);



    await messagesStore.markChatAsRead(directChatId, userId);
  };

  onMount(async () => {
    console.log("🚀 useChat.onMount START");
    
    console.log("🔍 Supabase Realtime Status:", {
      realtimeUrl: supabase.realtime.endPoint,
      channels: supabase.realtime.channels?.length || 0,
      connected: supabase.realtime.isConnected()
    });
    
    if (!isLoggedIn() || !sessionStore.user) {
      console.log("❌ useChat.onMount: Nicht eingeloggt");
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
        console.log("❌ useChat.onMount: Kein User gefunden");
        setLoading(false);
        return;
      }

      const userId = userData.id;
      setCurrentUserId(userId);
      console.log("✅ useChat.onMount: User ID:", userId);

      const partnerId = Number(params.partnerId);
      console.log("👥 useChat.onMount: Partner ID:", partnerId);
      
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
        setChatPartner(partnerData);
        console.log("✅ useChat.onMount: Partner gefunden:", partnerData.name);
      }

      const { data: chatData, error: chatError } = await supabase.rpc("get_or_create_direct_chat", {
        user1_id: userId,
        user2_id: partnerId,
      });

      if (chatError) throw chatError;

      const directChatId = chatData as number;
      setChatId(directChatId);
      console.log("✅ useChat.onMount: Chat ID:", directChatId);

      // ✅ WICHTIG: Warte auf loadMessages BEVOR loading auf false gesetzt wird
      await loadMessages(directChatId, userId);
      await messagesStore.markChatAsRead(directChatId, userId);

      if (globalChannel && globalChatId === directChatId) {
        console.log("⏭️ useChat.onMount: Channel bereits aktiv für Chat:", directChatId);
        setLoading(false);
        return;
      }

      if (globalChannel) {
        console.log("🧹 useChat.onMount: Entferne alten Channel");
        await supabase.removeChannel(globalChannel);
        globalChannel = null;
      }

      console.log("🔌 useChat.onMount: Setup Realtime für Chat:", directChatId);

      globalChannel = supabase.channel(`chat-messages-${directChatId}`, {
        config: {
          broadcast: { 
            self: true,
            ack: true
          }
        }
      });

      globalChannel
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "Messages",
            filter: `chat_id=eq.${directChatId}`,
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            console.log("🔔🔔🔔 useChat: INSERT Event:", payload.new.id);

            if (!validTypes.includes(payload.new.message_type)) {
              console.log("⏭️ useChat: Ungültiger message_type:", payload.new.message_type);
              return;
            }

            if (payload.new.sender_id === userId && payload.new.message_type === "direct") {
              console.log("⏭️ useChat: Eigene Direct Message, skip");
              return;
            }

            console.log("✅ useChat: Neue Message empfangen, lade alle Messages neu");
            loadMessages(directChatId, userId);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "Messages",
            filter: `chat_id=eq.${directChatId}`,
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            console.log("🔔 useChat: UPDATE Event:", payload.new.id);

            if (!validTypes.includes(payload.new.message_type)) {
              return;
            }

            console.log("✅ useChat: Message UPDATE, lade alle Messages neu");
            loadMessages(directChatId, userId);
          }
        )
        .on(
          "broadcast",
          { event: "message_updated" },
          (payload: { payload: { messageId: number; chatId: number } }) => {
            console.log("🔔🔔🔔 useChat: BROADCAST empfangen:", payload);
            
            const { messageId, chatId: updatedChatId } = payload.payload;
            
            if (updatedChatId !== directChatId) {
              console.log("⏭️ useChat: Broadcast ist für anderen Chat");
              return;
            }
            
            console.log("✅ useChat: Broadcast für unseren Chat, lade alle Messages neu");
            loadMessages(directChatId, userId);
          }
        )
        .subscribe((status: string, err?: Error) => {
          console.log("📡📡📡 useChat: Channel Status Changed:", {
            status,
            error: err,
            channelName: `chat-messages-${directChatId}`,
            timestamp: new Date().toISOString()
          });
          
          if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
            console.log("✅✅✅ REALTIME CHANNEL AKTIV!");
          } else if (status === REALTIME_SUBSCRIBE_STATES.CLOSED) {
            console.error("❌❌❌ REALTIME CHANNEL GESCHLOSSEN!");
          } else if (status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR) {
            console.error("❌❌❌ REALTIME CHANNEL ERROR:", err);
          }
        });

      globalChatId = directChatId;
      console.log("✅ useChat.onMount COMPLETE");
      
      // ✅ ENDLICH: Setze loading auf false NACHDEM alles geladen ist
      setLoading(false);
      
    } catch (err) {
      console.error("❌ useChat.onMount ERROR:", err);
      setLoading(false);
    }
  });

  onCleanup(() => {
    console.log("🧹 useChat.onCleanup");
    if (globalChannel) {
      supabase.removeChannel(globalChannel);
      globalChannel = null;
    }
  });

  const handleSendMessage = async (e: Event) => {
    e.preventDefault();
    console.log("📤 useChat.handleSendMessage START");
    
    const messageContent = newMessage().trim();
    const userId = currentUserId();
    const currentChatId = chatId();
    
    if (!messageContent || !userId || !currentChatId) {
      console.log("⏭️ useChat.handleSendMessage: Validation failed");
      return;
    }

    setSending(true);
    setNewMessage("");

    try {
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
          trustlevel: partner.trustlevel,
        } : {
          id: userId,
          name: "",
          surname: "",
          picture: null,
          trustlevel: null,
        }
      };

      console.log("✨ useChat: Füge optimistic message hinzu:", tempId);
      
      // ✅ Verwende globalen Store
      const currentMessages = messages();
      messagesStore.setChatMessages([...currentMessages, optimisticMessage]);
      
      setTimeout(scrollToBottom, 0);
      setTimeout(scrollToBottom, 100);

      const { data, error } = await supabase
        .from("Messages")
        .insert({
          content: messageContent,
          sender_id: userId,
          receiver_id: partnerId,
          chat_id: currentChatId,
          message_type: "direct",
          read: false,
          product_id: null,
          stars: null,
          created_at: new Date().toISOString(),
        })
        .select(messageSelect)
        .single<Message>();

      if (error) throw error;
      if (!data) throw new Error("Keine Daten erhalten");

      console.log("✅ useChat.handleSendMessage: Message gesendet:", data.id);
      
      // ✅ Lade alle Messages neu (ersetzt optimistic message)
      await loadMessages(currentChatId, userId);
      
    } catch (err) {
      console.error("❌ useChat.handleSendMessage ERROR:", err);
      alert("Fehler beim Senden der Nachricht: " + (err as Error).message);
      
      // ✅ Entferne optimistic message bei Fehler
      const currentMessages = messages();
      messagesStore.setChatMessages(currentMessages.filter(m => m.id >= 0));
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  const handleAcceptRequest = async (messageId: number, senderId: number, productId: number) => {
    console.log("✅ useChat.handleAcceptRequest START:", { messageId, senderId, productId });
    
    try {
      const ownerId = currentUserId();
      const cId = chatId();
      
      if (typeof ownerId !== "number") throw new Error("Owner nicht geladen");
      if (typeof cId !== "number") throw new Error("chatId fehlt");

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

      console.log("✅ useChat.handleAcceptRequest: DB Update erfolgreich");

      if (globalChannel) {
        console.log("📡 useChat.handleAcceptRequest: Sende Broadcast!");
        
        await globalChannel.send({
          type: 'broadcast',
          event: 'message_updated',
          payload: { 
            messageId, 
            chatId: cId,
            newType: 'request_qr_ready',
            timestamp: Date.now()
          }
        });
      }

      await loadMessages(cId, ownerId);
      
      console.log("✅ useChat.handleAcceptRequest COMPLETE");
    } catch (err) {
      console.error("❌ useChat.handleAcceptRequest ERROR:", err);
      alert("Fehler beim Akzeptieren der Anfrage (QR-Code)");
    }
  };

  const handleDeclineRequest = async (messageId: number) => {
    console.log("❌ useChat.handleDeclineRequest START:", messageId);
    
    try {
      const cId = chatId();
      const userId = currentUserId();
      
      const { error } = await supabase
        .from("Messages")
        .update({ message_type: "request_declined", read: true })
        .eq("id", messageId);

      if (error) throw error;

      console.log("✅ useChat.handleDeclineRequest: DB Update erfolgreich");

      if (globalChannel && cId) {
        console.log("📡 useChat.handleDeclineRequest: Sende Broadcast!");
        
        await globalChannel.send({
          type: 'broadcast',
          event: 'message_updated',
          payload: { 
            messageId, 
            chatId: cId,
            newType: 'request_declined',
            timestamp: Date.now()
          }
        });
      }

      if (cId && userId) {
        await loadMessages(cId, userId);
      }
      
      console.log("✅ useChat.handleDeclineRequest COMPLETE");
    } catch (err) {
      console.error("❌ useChat.handleDeclineRequest ERROR:", err);
      alert("Fehler beim Ablehnen der Anfrage.");
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
