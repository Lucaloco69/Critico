import { createSignal, createEffect, onMount, onCleanup } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { supabase } from "../lib/supabaseClient";
import sessionStore, { isLoggedIn } from "../lib/sessionStore";

interface Message {
  id: number;
  content: string;
  created_at: string;
  sender_id: number;
  read: boolean;
  User: {
    id: number;
    name: string;
    surname: string;
    picture: string | null;
  };
}

interface ChatPartner {
  id: number;
  name: string;
  surname: string;
  picture: string | null;
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

  // ✅ Ref direkt im Hook
  let mainContainerRef: HTMLElement | undefined;

  const scrollToBottom = () => {
    if (mainContainerRef) {
      mainContainerRef.scrollTop = mainContainerRef.scrollHeight;
      console.log("📜 Scrolled to bottom:", mainContainerRef.scrollHeight);
    } else {
      console.warn("⚠️ mainContainerRef ist undefined");
    }
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

  onMount(async () => {
    console.log("🚀 Component mounted");
    
    if (!isLoggedIn() || !sessionStore.user) {
      navigate("/login");
      return;
    }

    try {
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
      console.log("👤 Current User ID:", userId);

      const partnerId = Number(params.partnerId);
      if (!partnerId) {
        console.error("Keine Partner ID");
        return;
      }

      setLoading(true);

      const { data: partnerData } = await supabase
        .from("User")
        .select("id, name, surname, picture")
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
      console.log("💬 Chat ID:", directChatId);

      await loadMessages(directChatId, userId);

      if (globalChannel && globalChatId === directChatId) {
        console.log("♻️ Channel existiert bereits, wird wiederverwendet");
        return;
      }

      if (globalChannel) {
        console.log("🗑️ Entferne alten Channel");
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
            console.log("🔔🔔🔔 EVENT EMPFANGEN:", payload.eventType);
            
            if (payload.eventType === "INSERT") {
              console.log("✅ INSERT Event!");
              console.log("Chat ID:", payload.new.chat_id);
              console.log("Message Type:", payload.new.message_type);
              console.log("Sender ID:", payload.new.sender_id);
              
              if (payload.new.chat_id === directChatId && payload.new.message_type === "direct") {
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
                    User!Messages_sender_id_fkey (
                      id,
                      name,
                      surname,
                      picture
                    )
                  `)
                  .eq("id", payload.new.id)
                  .single()
                  .then(({ data: newMsg }) => {
                    if (newMsg) {
                      console.log("📨 Nachricht geladen:", newMsg);
                      setMessages(prev => [...prev, newMsg as any]);
                      
                      // ✅ Markiere als gelesen wenn Chat im Fokus ist (mit Delay)
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
                        }, 1000); // ✅ 1 Sekunde Delay
                      }
                    }
                  });
              } else {
                console.log("⏭️ Event ist für anderen Chat oder Typ");
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
      console.log("🏁 Loading finished");
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
          User!Messages_sender_id_fkey (
            id,
            name,
            surname,
            picture
          )
        `)
        .eq("chat_id", chatId)
        .eq("message_type", "direct")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading messages:", error);
        return;
      }

      console.log("📥 Loaded messages:", data?.length || 0);
      setMessages((data || []) as any);

      // ✅ Markiere ungelesene Nachrichten als gelesen (nur beim Öffnen)
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
          User!Messages_sender_id_fkey (
            id,
            name,
            surname,
            picture
          )
        `)
        .single();

      if (error) throw error;

      if (data) {
        console.log("✅ Nachricht gesendet:", data.id);
        setMessages(prev => [...prev, data as any]);
      }

      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Fehler beim Senden der Nachricht");
    } finally {
      setSending(false);
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

  return {
    messages,
    newMessage,
    setNewMessage,
    chatPartner,
    currentUserId,
    loading,
    sending,
    handleSendMessage,
    formatTime,
    setMainContainerRef,
  };
}
