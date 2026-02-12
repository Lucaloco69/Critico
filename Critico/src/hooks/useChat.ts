import { createSignal, createEffect, onMount, onCleanup } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { supabase } from "../lib/supabaseClient";
import sessionStore, { isLoggedIn } from "../lib/sessionStore";
import { messagesStore } from "../lib/messagesStore";

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

  const [messages, setMessages] = createSignal<Message[]>([]);
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

  const upsertMessageLocal = (msg: Message) => {
    console.log("🔧 useChat.upsertMessageLocal:", msg.id, msg.content.substring(0, 30));
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === msg.id);
      if (idx === -1) {
        console.log("✅ useChat: Neue Message hinzugefügt");
        return [...prev, msg];
      }
      console.log("🔄 useChat: Existierende Message aktualisiert");
      const copy = prev.slice();
      copy[idx] = msg;
      return copy;
    });
    setTimeout(scrollToBottom, 100);
  };

  const fetchMessageById = async (id: number) => {
    console.log("🔍 useChat.fetchMessageById:", id);
    const { data, error } = await supabase.from("Messages").select(messageSelect).eq("id", id).single<Message>();
    if (error) {
      console.warn("⚠️ useChat.fetchMessageById failed:", { id, error });
      return null;
    }
    console.log("✅ useChat.fetchMessageById success:", id);
    return data;
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
  
  // ✅ WICHTIG: Erstelle neue Array-Instanz um Reactivity zu triggern
  const newMessages = data ? [...data] : [];
  setMessages(newMessages);
  
  console.log("🔄 useChat.loadMessages: Messages gesetzt, länge:", newMessages.length);

  const req =
    newMessages.find((m) => m.message_type === "request") ||
    newMessages.find((m) => m.message_type === "request_qr_ready") ||
    newMessages.find((m) => m.message_type === "request_accepted" || m.message_type === "request_declined");

  setProductOwnerId(req?.product?.owner_id ?? null);

  queueMicrotask(scrollToBottom);
};


  const handleUpdateEvent = (payload: any, source: string) => {
    console.log(`🔔🔔🔔 useChat: UPDATE Event (${source}):`, payload);

    if (!validTypes.includes(payload.new.message_type)) {
      console.log("⏭️ useChat: Ungültiger message_type bei UPDATE:", payload.new.message_type);
      return;
    }

    console.log("🔄 useChat: Message UPDATE empfangen");
    fetchMessageById(payload.new.id).then((full) => {
      if (!full) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === payload.new.id ? { ...m, message_type: payload.new.message_type, read: payload.new.read } : m
          )
        );
        return;
      }
      upsertMessageLocal(full);
      
      const currentChatId = chatId();
      console.log("🔔 useChat (UPDATE): Calling messagesStore.notifyChatUpdated:", currentChatId);
      
      if (currentChatId) {
        messagesStore.notifyChatUpdated(currentChatId);
        console.log("✅ useChat (UPDATE): Store benachrichtigt");
      }
    });
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
        return;
      }

      const userId = userData.id;
      setCurrentUserId(userId);
      console.log("✅ useChat.onMount: User ID:", userId);

      const partnerId = Number(params.partnerId);
      console.log("👥 useChat.onMount: Partner ID:", partnerId);
      
      if (!partnerId) return;

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

      await loadMessages(directChatId, userId);
      await messagesStore.markChatAsRead(directChatId, userId);

      if (globalChannel && globalChatId === directChatId) {
        console.log("⏭️ useChat.onMount: Channel bereits aktiv für Chat:", directChatId);
        return;
      }

      if (globalChannel) {
        console.log("🧹 useChat.onMount: Entferne alten Channel");
        await supabase.removeChannel(globalChannel);
        globalChannel = null;
      }

      console.log("🔌 useChat.onMount: Setup Realtime für Chat:", directChatId);
      console.log("🔌 useChat: Registriere Event-Listener für:", {
        chat_id: directChatId,
        sender_id: userId,
        receiver_id: partnerId
      });

      globalChannel = supabase
        .channel(`chat-messages-${directChatId}`)
        // ✅ INSERT Event
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "Messages",
            filter: `chat_id=eq.${directChatId}`,
          },
          (payload) => {
            console.log("🔔🔔🔔 useChat: INSERT Event:", payload);

            if (!validTypes.includes(payload.new.message_type)) {
              console.log("⏭️ useChat: Ungültiger message_type:", payload.new.message_type);
              return;
            }

            if (payload.new.sender_id === userId && payload.new.message_type === "direct") {
              console.log("⏭️ useChat: Eigene Direct Message, skip (bereits lokal hinzugefügt)");
              return;
            }

            console.log("📥 useChat: Neue Message empfangen, lade vollständig...");
            fetchMessageById(payload.new.id).then((full) => {
              if (!full) {
                console.warn("⚠️ useChat: Konnte Message nicht laden");
                return;
              }
              console.log("✅ useChat: Message geladen, füge hinzu");
              upsertMessageLocal(full);

              const currentChatId = chatId();
              console.log("🔔 useChat: Calling messagesStore.notifyChatUpdated:", currentChatId);
              
              if (currentChatId) {
                messagesStore.notifyChatUpdated(currentChatId);
                console.log("✅ useChat: messagesStore.notifyChatUpdated aufgerufen");
              }

              if (full.receiver_id === userId) {
                const currentChatId = chatId();
                if (currentChatId) {
                  console.log("📖 useChat: Markiere Message als gelesen:", full.id);
                  supabase
                    .from("Messages")
                    .update({ read: true })
                    .eq("id", full.id)
                    .then(() => {
                      console.log("✅ useChat: Message als gelesen markiert");
                      messagesStore.clearUnreadCount(currentChatId);
                      messagesStore.notifyChatUpdated(currentChatId);
                      console.log("✅ useChat: Store nach read-update benachrichtigt");
                    });
                }
              }
            });
          }
        )
        // ✅ UPDATE Event (fallback - funktioniert nicht zuverlässig)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "Messages",
            filter: `chat_id=eq.${directChatId}`,
          },
          (payload) => handleUpdateEvent(payload, "chat_id")
        )
        // ✅✅✅ BROADCAST Event - DAS IST DIE LÖSUNG!
        .on(
          "broadcast",
          { event: "message_updated" },
          (payload) => {
            console.log("🔔🔔🔔 useChat: BROADCAST empfangen:", payload);
            
            const { messageId, chatId: updatedChatId } = payload.payload;
            
            if (updatedChatId !== directChatId) {
              console.log("⏭️ useChat: Broadcast ist für anderen Chat");
              return;
            }
            
            console.log("✅ useChat: Broadcast für unseren Chat, lade Messages neu!");
            loadMessages(directChatId, userId);
            
            const currentChatId = chatId();
            if (currentChatId) {
              messagesStore.notifyChatUpdated(currentChatId);
            }
          }
        )
        .subscribe((status, err) => {
          console.log("📡📡📡 useChat: Channel Status Changed:", {
            status,
            error: err,
            channelName: `chat-messages-${directChatId}`,
            userId,
            chatId: directChatId,
            timestamp: new Date().toISOString()
          });
          
          if (status === 'SUBSCRIBED') {
            console.log("✅✅✅ REALTIME CHANNEL AKTIV!");
          } else if (status === 'CLOSED') {
            console.error("❌❌❌ REALTIME CHANNEL GESCHLOSSEN!");
          } else if (status === 'CHANNEL_ERROR') {
            console.error("❌❌❌ REALTIME CHANNEL ERROR:", err);
          }
        });

      globalChatId = directChatId;
      console.log("✅ useChat.onMount COMPLETE");
    } catch (err) {
      console.error("❌ useChat.onMount ERROR:", err);
    } finally {
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
    
    console.log("📤 Validation:", { 
      hasContent: !!messageContent, 
      userId, 
      chatId: currentChatId 
    });
    
    if (!messageContent || !userId || !currentChatId) {
      console.log("⏭️ useChat.handleSendMessage: Validation failed");
      return;
    }

    setSending(true);
    setNewMessage("");

    try {
      const partnerId = Number(params.partnerId);
      const partner = chatPartner();
      
      console.log("📤 useChat.handleSendMessage: Sending to partner:", partnerId);

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
      setMessages(prev => [...prev, optimisticMessage]);
      
      setTimeout(scrollToBottom, 0);
      setTimeout(scrollToBottom, 100);

      console.log("🌐 useChat: Sende an Supabase...");
      
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
      
      setMessages(prev => prev.map(m => m.id === tempId ? data : m));
      setTimeout(scrollToBottom, 100);
      
      console.log("🔔 useChat.handleSendMessage: Calling messagesStore.notifyChatUpdated:", currentChatId);
      messagesStore.notifyChatUpdated(currentChatId);
      
    } catch (err) {
      console.error("❌ useChat.handleSendMessage ERROR:", err);
      alert("Fehler beim Senden der Nachricht: " + (err as Error).message);
      setMessages(prev => prev.filter(m => m.id >= 0));
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
    
    console.log("🔍 useChat.handleAcceptRequest - Debug:", {
      messageId,
      chatId: cId,
      hasGlobalChannel: !!globalChannel,
      globalChannelState: globalChannel?.state
    });
    
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

    // ✅ BROADCAST: Sende an alle Chat-Teilnehmer
    if (globalChannel) {
      console.log("📡📡📡 useChat.handleAcceptRequest: Sende Broadcast!");
      
      try {
        const broadcastResult = await globalChannel.send({
          type: 'broadcast',
          event: 'message_updated',
          payload: { 
            messageId, 
            chatId: cId,
            newType: 'request_qr_ready',
            timestamp: Date.now()
          }
        });
        
        console.log("✅✅✅ Broadcast gesendet! Result:", broadcastResult);
      } catch (broadcastError) {
        console.error("❌ Broadcast Error:", broadcastError);
      }
    } else {
      console.error("❌❌❌ KEIN BROADCAST MÖGLICH - globalChannel ist null!");
    }

    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, message_type: "request_qr_ready", read: true } : m))
    );

    const full = await fetchMessageById(messageId);
    if (full) upsertMessageLocal(full);
    
    console.log("🔔 useChat.handleAcceptRequest: Calling messagesStore.notifyChatUpdated:", cId);
    if (cId) {
      messagesStore.notifyChatUpdated(cId);
      console.log("✅ useChat.handleAcceptRequest: Store benachrichtigt");
    }
    
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
    
    console.log("🔍 useChat.handleDeclineRequest - Debug:", {
      messageId,
      chatId: cId,
      hasGlobalChannel: !!globalChannel,
      globalChannelState: globalChannel?.state
    });
    
    const { error } = await supabase
      .from("Messages")
      .update({ message_type: "request_declined", read: true })
      .eq("id", messageId);

    if (error) throw error;

    console.log("✅ useChat.handleDeclineRequest: DB Update erfolgreich");

    // ✅ BROADCAST: Sende an alle Chat-Teilnehmer
    if (globalChannel && cId) {
      console.log("📡📡📡 useChat.handleDeclineRequest: Sende Broadcast!");
      
      try {
        const broadcastResult = await globalChannel.send({
          type: 'broadcast',
          event: 'message_updated',
          payload: { 
            messageId, 
            chatId: cId,
            newType: 'request_declined',
            timestamp: Date.now()
          }
        });
        
        console.log("✅✅✅ Broadcast gesendet! Result:", broadcastResult);
      } catch (broadcastError) {
        console.error("❌ Broadcast Error:", broadcastError);
      }
    } else {
      console.error("❌❌❌ KEIN BROADCAST MÖGLICH:", {
        hasChannel: !!globalChannel,
        hasChatId: !!cId
      });
    }

    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, message_type: "request_declined", read: true } : m))
    );

    const full = await fetchMessageById(messageId);
    if (full) upsertMessageLocal(full);
    
    console.log("🔔 useChat.handleDeclineRequest: Calling messagesStore.notifyChatUpdated:", cId);
    
    if (cId) {
      messagesStore.notifyChatUpdated(cId);
      console.log("✅ useChat.handleDeclineRequest: Store benachrichtigt");
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
