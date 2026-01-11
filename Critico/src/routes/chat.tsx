import { createSignal, createEffect, For, Show, onCleanup } from "solid-js";
import { useParams, A, useNavigate } from "@solidjs/router";
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


export default function Chat() {
  const params = useParams();
  const navigate = useNavigate();
  
  const [messages, setMessages] = createSignal<Message[]>([]);
  const [newMessage, setNewMessage] = createSignal("");
  const [chatPartner, setChatPartner] = createSignal<ChatPartner | null>(null);
  const [currentUserId, setCurrentUserId] = createSignal<number | null>(null);
  const [chatId, setChatId] = createSignal<number | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [sending, setSending] = createSignal(false);


  // Lade aktuellen User
  createEffect(async () => {
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


      if (userData) {
        setCurrentUserId(userData.id);
      }
    } catch (err) {
      console.error("Error loading user:", err);
    }
  });


  // Lade Chat und Messages
  createEffect(async () => {
    const userId = currentUserId();
    const partnerId = Number(params.partnerId);


    if (!userId || !partnerId) return;


    try {
      setLoading(true);


      // Hole Chat Partner Info
      const { data: partnerData } = await supabase
        .from("User")
        .select("id, name, surname, picture")
        .eq("id", partnerId)
        .single();


      if (partnerData) {
        setChatPartner(partnerData);
      }


      // Hole oder erstelle Direct Chat mit SQL Funktion
      const { data: chatData, error: chatError } = await supabase
        .rpc("get_or_create_direct_chat", {
          user1_id: userId,
          user2_id: partnerId
        });


      if (chatError) throw chatError;
      
      const directChatId = chatData as number;
      setChatId(directChatId);


      // Lade Messages (markiert automatisch als gelesen)
      await loadMessages(directChatId, userId);


      // Realtime Subscription
      const channel = supabase
        .channel(`chat_${directChatId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "Messages",
            filter: `chat_id=eq.${directChatId}`,
          },
          async (payload) => {
            if (payload.new.message_type !== "direct") return;


            const { data: newMsg } = await supabase
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
              .single();


            if (newMsg) {
              setMessages(prev => [...prev, newMsg as any]);
              
              // ✅ Markiere neue Nachricht sofort als gelesen wenn sie an mich ist
              if (newMsg.sender_id !== userId && !newMsg.read) {
                await supabase
                  .from("Messages")
                  .update({ read: true })
                  .eq("id", newMsg.id);
                
                console.log("✅ New message marked as read");
              }
              
              scrollToBottom();
            }
          }
        )
        .subscribe();


      onCleanup(() => {
        supabase.removeChannel(channel);
      });


    } catch (err) {
      console.error("Error loading chat:", err);
    } finally {
      setLoading(false);
    }
  });


  // ✅ Verbesserte loadMessages Funktion - markiert automatisch als gelesen
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

      setMessages((data || []) as any);

      // ✅ Markiere SOFORT ungelesene Nachrichten als gelesen (nur die, die an mich sind)
      const unreadIds = (data || [])
        .filter(m => m.sender_id !== userId && !m.read)
        .map(m => m.id);

      if (unreadIds.length > 0) {
        await supabase
          .from("Messages")
          .update({ read: true })
          .in("id", unreadIds);
        
        console.log(`✅ ${unreadIds.length} messages marked as read`);
      }

      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error("Error in loadMessages:", err);
    }
  };


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
          read: false,  // ✅ Neue Nachrichten sind ungelesen
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
        setMessages(prev => [...prev, data as any]);
        scrollToBottom();
      }


      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Fehler beim Senden der Nachricht");
    } finally {
      setSending(false);
    }
  };


  const scrollToBottom = () => {
    setTimeout(() => {
      const container = document.getElementById("messages-container");
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 50);
  };


  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };


  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header class="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
        <div class="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>


          <Show when={chatPartner()}>
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                {chatPartner()!.name.charAt(0)}{chatPartner()!.surname.charAt(0)}
              </div>
              <div>
                <h1 class="font-semibold text-gray-900 dark:text-white">
                  {chatPartner()!.name} {chatPartner()!.surname}
                </h1>
              </div>
            </div>
          </Show>
        </div>
      </header>


      {/* Messages Container */}
      <main class="flex-1 overflow-hidden flex flex-col">
        <Show when={loading()}>
          <div class="flex-1 flex items-center justify-center">
            <div class="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </Show>


        <Show when={!loading()}>
          <div
            id="messages-container"
            class="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-5xl mx-auto w-full"
          >
            <Show when={messages().length === 0}>
              <div class="text-center py-12">
                <svg class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p class="text-gray-500 dark:text-gray-400">
                  Noch keine Nachrichten. Starte die Unterhaltung!
                </p>
              </div>
            </Show>


            <For each={messages()}>
              {(message) => {
                const isOwn = message.sender_id === currentUserId();
                return (
                  <div class={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                    <div class={`flex gap-2 max-w-[70%] ${isOwn ? "flex-row-reverse" : ""}`}>
                      <div class="w-8 h-8 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
                        {message.User.name.charAt(0)}
                      </div>
                      <div>
                        <div class={`px-4 py-2 rounded-2xl shadow-md ${
                          isOwn
                            ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white"
                            : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        }`}>
                          <p class="break-words">{message.content}</p>
                        </div>
                        <p class={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${isOwn ? "text-right" : ""}`}>
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>


          {/* Input Form */}
          <div class="bg-white dark:bg-gray-800 border-t dark:border-gray-700 p-4">
            <form onSubmit={handleSendMessage} class="max-w-5xl mx-auto flex gap-3">
              <input
                type="text"
                value={newMessage()}
                onInput={(e) => setNewMessage(e.currentTarget.value)}
                placeholder="Nachricht schreiben..."
                class="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                disabled={sending()}
              />
              <button
                type="submit"
                disabled={!newMessage().trim() || sending()}
                class="px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Senden
              </button>
            </form>
          </div>
        </Show>
      </main>
    </div>
  );
}
