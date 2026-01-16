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
  message_type?: "direct" | "request" | "request_accepted" | "request_declined" | "product";
  product_id?: number;
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
  const [productOwnerId, setProductOwnerId] = createSignal<number | null>(null);




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



  const loadMessages = async (directChatId: number, userId: number) => {
    const { data, error } = await supabase
      .from("Messages")
      .select(`
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
      `)
      .eq("chat_id", directChatId)
      .in("message_type", ["direct", "request", "request_accepted", "request_declined"])
      .order("created_at", { ascending: true })
      .returns<Message[]>();



    if (error) {
      console.error("Error loading messages:", error);
      return;
    }



    setMessages(data ?? []);

    // ✅ Finde die erste Request Message und setze Owner = Receiver
    const requestMsg = (data || []).find(m => 
      m.message_type === "request" || 
      m.message_type === "request_accepted" || 
      m.message_type === "request_declined"
    );

    if (requestMsg && requestMsg.receiver_id) {
      setProductOwnerId(requestMsg.receiver_id);
      console.log("🏭 Product Owner ID (from receiver_id):", requestMsg.receiver_id);
      console.log("👤 Current User ID:", userId);
      console.log("✅ Is Owner?", requestMsg.receiver_id === userId);
    }

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
      console.log("👤 Current User ID:", userId);




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
                  `)
                  .eq("id", payload.new.id)
                  .single<Message>()
                  .then(({ data: newMsg }) => {
                    if (newMsg) {
                      console.log("📨 Nachricht geladen:", newMsg);
                      setMessages(prev => [...prev, newMsg]);
                      
                      // ✅ Update productOwnerId wenn es eine Request Message ist
                      if (newMsg.message_type && 
                          ["request", "request_accepted", "request_declined"].includes(newMsg.message_type) && 
                          newMsg.receiver_id) {
                        setProductOwnerId(newMsg.receiver_id);
                        console.log("🏭 Product Owner ID updated:", newMsg.receiver_id);
                      }
                      
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
            
            if (payload.eventType === "UPDATE") {
              console.log("🔄 UPDATE Event!");
              
              if (payload.new.chat_id === directChatId) {
                console.log("🎯 Update für diesen Chat!");
                
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === payload.new.id
                      ? { 
                          ...msg, 
                          message_type: payload.new.message_type,
                          read: payload.new.read // ✅ NEU: Update auch den read status
                        }
                      : msg
                  )
                );
                
                console.log("✅ Message updated:", payload.new.message_type, "read:", payload.new.read);
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
        `)
        .single<Message>();


      if (error) throw error;


      if (data) {
        console.log("✅ Nachricht gesendet:", data.id);
        console.log("🧩 Message Sender:", {
          sender_id: data.sender_id,
          sender_name: data.sender?.name,
          trustlevel: data.sender?.trustlevel,
        });


        setMessages((prev) => [...prev, data]);
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
    try {
      console.log("✅ Akzeptiere Request:", messageId);

      // 1. Update Message zu "request_accepted" UND markiere als gelesen
      const { error: updateError } = await supabase
        .from("Messages")
        .update({ 
          message_type: "request_accepted",
          read: true // ✅ NEU: Markiere als gelesen
        })
        .eq("id", messageId);

      if (updateError) throw updateError;

      // 2. Füge Permission hinzu
      const { error: permissionError } = await supabase
        .from("ProductComments_User")
        .insert({
          user_id: senderId,
          product_id: productId,
        })
        .select()
        .single();

      if (permissionError && permissionError.code !== "23505") {
        console.error("Permission Error:", permissionError);
      }

      // 3. Update local state
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId 
            ? { ...msg, message_type: "request_accepted", read: true } // ✅ NEU: read: true
            : msg
        )
      );

      console.log("🎉 Request akzeptiert und als gelesen markiert!");
    } catch (err) {
      console.error("Error accepting request:", err);
      alert("Fehler beim Akzeptieren der Anfrage");
    }
  };



  const handleDeclineRequest = async (messageId: number) => {
    try {
      console.log("❌ Lehne Request ab:", messageId);

      const { error } = await supabase
        .from("Messages")
        .update({ 
          message_type: "request_declined",
          read: true // ✅ NEU: Markiere als gelesen
        })
        .eq("id", messageId);

      if (error) throw error;

      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId 
            ? { ...msg, message_type: "request_declined", read: true } // ✅ NEU: read: true
            : msg
        )
      );

      console.log("❌ Request abgelehnt und als gelesen markiert!");
    } catch (err) {
      console.error("Error declining request:", err);
      alert("Fehler beim Ablehnen der Anfrage");
    }
  };



  createEffect(() => {
    const last = messages().at(-1);
    if (last) console.log("last msg trustlevel:", last.sender?.trustlevel);
  });



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
