import { createSignal, createEffect, onMount } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { supabase } from "../lib/supabaseClient";
import sessionStore, { isLoggedIn } from "../lib/sessionStore";


export type DbUser = {
  id: number;
  name: string;
  surname: string;
  picture: string | null;
  trustlevel: number | null;
};

export interface Message = {
  id: number;
  content: string;
  created_at: string;
  sender_id: number;
  read: boolean;
  message_type?: "direct" | "request" | "request_accepted" | "request_declined" | "product";
  product_id?: number;
  User: DbUser | null; // ✅ Sender user
}

export type ChatPartner = {
  id: number;
  name: string;
  surname: string;
  picture: string | null;
  trustlevel: number | null;
};

type DbMessageRow = {
  id: number;
  content: string;
  created_at: string;
  sender_id: number;
  read: boolean;
  sender: DbUser | null; // ✅ alias in select()
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
  const [productOwnerId, setProductOwnerId] = createSignal<number | null>(null); // ✅ NEU


  let mainContainerRef: HTMLElement | undefined;
  const setMainContainerRef = (el: HTMLElement | undefined) => {
    mainContainerRef = el;
  };


  const scrollToBottom = () => {
    if (mainContainerRef) mainContainerRef.scrollTop = mainContainerRef.scrollHeight;
  };


  createEffect(() => {
    const msgs = messages();
    const isLoading = loading();
    
    console.log("🔄 createEffect triggered - Messages:", msgs.length, "Loading:", isLoading);
    
    if (!isLoading && msgs.length > 0) {
      console.log("✅ Bedingung erfüllt, scrolle nach unten");
      setTimeout(() => scrollToBottom(), 0);
      setTimeout(() => scrollToBottom(), 100);
      setTimeout(() => scrollToBottom(), 300);
    } else {
      console.log("⏭️ Bedingung nicht erfüllt");
    }
  });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  };

  const mapRow = (row: DbMessageRow): Message => ({
    id: row.id,
    content: row.content,
    created_at: row.created_at,
    sender_id: row.sender_id,
    read: row.read,
    User: row.sender ?? null,
  });

  const loadMessages = async (directChatId: number) => {
    const { data, error } = await supabase
      .from("Messages")
      .select(
        `
        id,
        content,
        created_at,
        sender_id,
        read,
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
      .eq("message_type", "direct")
      .order("created_at", { ascending: true })
      .returns<DbMessageRow[]>();

    if (error) {
      console.error("Error loading messages:", error);
      return;
    }

    setMessages((data ?? []).map(mapRow));
    queueMicrotask(scrollToBottom);
  };

  onMount(async () => {
    if (!isLoggedIn() || !sessionStore.user) {
      navigate("/login");
      return;
    }


    try {
      setLoading(true);

      const { data: userData, error: userErr } = await supabase
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
      console.log("👤 Current User ID:", userId);


      const partnerId = Number(params.partnerId);
      if (!partnerId) {
        console.error("Keine Partner ID");
        return;
      }


      setLoading(true);


      const { data: partnerData } = await supabase
        .from("User")
        .select("id, name, surname, picture, trustlevel")
        .eq("id", partnerId)
        .single();


      if (partnerData) {
        setChatPartner(partnerData);
        console.log("👥 Chat Partner:", partnerData.name);
      }


      const { data: chatData, error: chatError } = await supabase
        .rpc("get_or_create_direct_chat", {
          user1_id: userId,
          user2_id: partnerId
        });


      if (chatError) throw chatError;
      const directChatId = chatData as number;
      setChatId(directChatId);


      await loadMessages(directChatId, userId);


      if (globalChannel && globalChatId === directChatId) {
        console.log("♻️ Channel existiert bereits, wird wiederverwendet");
        return;
      }


      if (globalChannel) {
        await supabase.removeChannel(globalChannel);
        globalChannel = null;
      }


      console.log("🔌 Setting up Realtime subscription for chat:", directChatId);


      globalChannel = supabase
        .channel('any-messages-' + Date.now())
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "Messages",
          },
          (payload) => {
            console.log("🔔 EVENT EMPFANGEN:", payload.eventType);
            
            if (payload.eventType === "INSERT") {
              console.log("✅ INSERT Event!");
              console.log("Chat ID:", payload.new.chat_id);
              console.log("Message Type:", payload.new.message_type);
              console.log("Sender ID:", payload.new.sender_id);
              
              // ✅ GEÄNDERT: Akzeptiere auch request messages
              const validTypes = ["direct", "request", "request_accepted", "request_declined"];
              
              if (payload.new.chat_id === directChatId && validTypes.includes(payload.new.message_type)) {
                console.log("🎯 Richtige Nachricht für diesen Chat!");
              
                if (payload.new.sender_id === userId) {
                  console.log("⏭️ Eigene Nachricht, wird ignoriert");
                  return;
                }


                supabase
                  .from("Messages")
                  .select(`
                    id,
                    content,
                    created_at,
                    sender_id,
                    read,
                    message_type,
                    product_id,
                    User!Messages_sender_id_fkey (
                      id,
                      name,
                      surname,
                      picture,
                      trustlevel
                    )
                  `)
                  .eq("id", payload.new.id)
                  .single()
                  .then(({ data: newMsg }) => {
                    if (newMsg) {
                      console.log("📨 Nachricht geladen:", newMsg);
                      setMessages(prev => [...prev, newMsg as any]);
                      
                      if (newMsg.sender_id !== userId && !newMsg.read && document.hasFocus()) {
                        console.log("👁️ Chat hat Fokus, markiere als gelesen nach 1 Sekunde");
                        
                        setTimeout(() => {
                          supabase
                            .from("Messages")
                            .update({ read: true })
                            .eq("id", newMsg.id)
                            .then(() => {
                              setMessages(prev => 
                                prev.map(msg => 
                                  msg.id === newMsg.id ? { ...msg, read: true } : msg
                                )
                              );
                              console.log("✅ Nachricht als gelesen markiert");
                            });
                        }, 1000);
                      }
                    }
                  });
              } else {
                console.log("⏭️ Event ist für anderen Chat oder Typ");
              }
            }
            
            // ✅ NEU: Handle UPDATE events (für request_accepted/declined)
            if (payload.eventType === "UPDATE") {
              console.log("🔄 UPDATE Event!");
              
              if (payload.new.chat_id === directChatId) {
                console.log("🎯 Update für diesen Chat!");
                
                // Update die Message in der Liste
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === payload.new.id
                      ? { ...msg, message_type: payload.new.message_type }
                      : msg
                  )
                );
                
                console.log("✅ Message updated:", payload.new.message_type);
              }
            }
          }
        )
        .subscribe((status, err) => {
          console.log("📡 Channel Status:", status);
          if (err) {
            console.error("❌ Subscribe Error:", err);
          }
        });


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


  const loadMessages = async (chatId: number, userId: number) => {
    try {
      const { data, error } = await supabase
        .from("Messages")
        .select(`
          id,
          content,
          created_at,
          sender_id,
          read,
          message_type,
          product_id,
          User!Messages_sender_id_fkey (
            id,
            name,
            surname,
            picture,
            trustlevel
          )
        `)
        .eq("chat_id", chatId)
        .in("message_type", ["direct", "request", "request_accepted", "request_declined"]) // ✅ GEÄNDERT
        .order("created_at", { ascending: true });


      if (error) {
        console.error("Error loading messages:", error);
        return;
      }


      console.log("📥 Loaded messages:", data?.length || 0);
      setMessages((data || []) as any);


      // ✅ Lade Product Owner ID wenn es Request Messages gibt
      const requestMessages = (data || []).filter(m => 
        m.message_type === "request" || 
        m.message_type === "request_accepted" || 
        m.message_type === "request_declined"
      );
      
      if (requestMessages.length > 0 && requestMessages[0].product_id) {
        const { data: productData } = await supabase
          .from("Product")
          .select("owner_id")
          .eq("id", requestMessages[0].product_id)
          .single();
        
        if (productData) {
          setProductOwnerId(productData.owner_id);
          console.log("🏭 Product Owner ID:", productData.owner_id);
        }
      }


      const unreadIds = (data || [])
        .filter(m => m.sender_id !== userId && !m.read)
        .map(m => m.id);


      if (unreadIds.length > 0) {
        console.log("📖 Markiere", unreadIds.length, "Nachrichten als gelesen beim Öffnen");
        
        await supabase
          .from("Messages")
          .update({ read: true })
          .in("id", unreadIds);
        
        setMessages(prev => 
          prev.map(msg => 
            unreadIds.includes(msg.id) ? { ...msg, read: true } : msg
          )
        );
        
        console.log(`✅ ${unreadIds.length} Nachrichten als gelesen markiert`);
      }
    } catch (err) {
      console.error("Error in loadMessages:", err);
    }
  };


  const handleSendMessage = async (e: Event) => {
    e.preventDefault();


    if (!newMessage().trim() || !currentUserId() || !chatId()) return;


    setSending(true);
    console.log("📤 Sende Nachricht...");


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
        .select(`
          id,
          content,
          created_at,
          sender_id,
          read,
          message_type,
          product_id,
          User!Messages_sender_id_fkey (
            id,
            name,
            surname,
            picture,
            trustlevel
          )
        `)
        .single();


      if (error) throw error;


      if (data) {
        console.log("✅ Nachricht gesendet:", data.id);
        setMessages(prev => [...prev, data as any]);
      }

      const mapped = mapRow(data);
    console.log("🧩 mapped message", {
      mapped_sender_id: mapped.sender_id,
      mapped_user_id: mapped.User?.id,
      mapped_trustlevel: mapped.User?.trustlevel,
    });

    setMessages((prev) => [...prev, mapped]);
    setNewMessage("");
    queueMicrotask(scrollToBottom);

      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Fehler beim Senden der Nachricht");
    } finally {
      setSending(false);
    }
  };


  // ✅ NEU: Accept Request Handler
  const handleAcceptRequest = async (messageId: number, senderId: number, productId: number) => {
    try {
      console.log("✅ Akzeptiere Request:", messageId);

      // 1. Update Message zu "request_accepted"
      const { error: updateError } = await supabase
        .from("Messages")
        .update({ message_type: "request_accepted" })
        .eq("id", messageId);

      if (updateError) throw updateError;

      // 2. Füge Permission hinzu (wird durch Trigger automatisch gemacht, aber zur Sicherheit)
      const { error: permissionError } = await supabase
        .from("ProductComments_User")
        .insert({
          user_id: senderId,
          product_id: productId,
        })
        .select()
        .single();

      // Ignoriere Conflict Error (falls schon vorhanden)
      if (permissionError && permissionError.code !== "23505") {
        console.error("Permission Error:", permissionError);
      }

      // 3. Update local state
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId ? { ...msg, message_type: "request_accepted" } : msg
        )
      );

      console.log("🎉 Request akzeptiert!");
    } catch (err) {
      console.error("Error accepting request:", err);
      alert("Fehler beim Akzeptieren der Anfrage");
    }
  };


  // ✅ NEU: Decline Request Handler
  const handleDeclineRequest = async (messageId: number) => {
    try {
      console.log("❌ Lehne Request ab:", messageId);

      const { error } = await supabase
        .from("Messages")
        .update({ message_type: "request_declined" })
        .eq("id", messageId);

      if (error) throw error;

      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId ? { ...msg, message_type: "request_declined" } : msg
        )
      );
      
      

      console.log("❌ Request abgelehnt!");
    } catch (err) {
      console.error("Error declining request:", err);
      alert("Fehler beim Ablehnen der Anfrage");
    }
  };


  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };


  const setMainContainerRef = (el: HTMLElement | undefined) => {
    mainContainerRef = el;
  };
  
   createEffect(() => {
    const last = messages().at(-1);
    if (last) console.log("last msg trustlevel:", last.User?.trustlevel);
  });


  return {
    messages,
    newMessage,
    setNewMessage,
    chatPartner,
    currentUserId,
    productOwnerId, // ✅ NEU
    loading,
    sending,
    handleSendMessage,
    handleAcceptRequest, // ✅ NEU
    handleDeclineRequest, // ✅ NEU
    formatTime,
    setMainContainerRef,
  };
}
