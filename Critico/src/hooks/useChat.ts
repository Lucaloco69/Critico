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

export type Message = {
  id: number;
  content: string;
  created_at: string;
  sender_id: number;
  read: boolean;
  User: DbUser | null; // ✅ Sender user
};

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

  let mainContainerRef: HTMLElement | undefined;
  const setMainContainerRef = (el: HTMLElement | undefined) => {
    mainContainerRef = el;
  };

  const scrollToBottom = () => {
    if (mainContainerRef) mainContainerRef.scrollTop = mainContainerRef.scrollHeight;
  };

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

      if (userErr || !userData) throw userErr;
      setCurrentUserId(userData.id);

      const partnerId = Number((params as any).partnerId);
      if (!partnerId) throw new Error("Keine Partner ID");

      const { data: partnerData } = await supabase
        .from("User")
        .select("id, name, surname, picture, trustlevel")
        .eq("id", partnerId)
        .single();

      if (partnerData) setChatPartner(partnerData as ChatPartner);

      const { data: chatData, error: chatError } = await supabase.rpc("get_or_create_direct_chat", {
        user1_id: userData.id,
        user2_id: partnerId,
      });

      if (chatError) throw chatError;
      const directChatId = chatData as number;
      setChatId(directChatId);

      await loadMessages(directChatId);

      // Realtime: INSERT liefert keine Join-Daten -> danach einzelnes Select mit Join
      if (globalChannel && globalChatId === directChatId) return;

      if (globalChannel) {
        await supabase.removeChannel(globalChannel);
        globalChannel = null;
      }

      globalChannel = supabase
        .channel("direct-messages-" + directChatId)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "Messages" }, (payload) => {
          if (payload.new.chat_id !== directChatId || payload.new.message_type !== "direct") return;
          if (payload.new.sender_id === userData.id) return;

          supabase
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
            .eq("id", payload.new.id)
            .single()
            .returns<DbMessageRow>()
            .then(({ data }) => {
              if (!data) return;
              setMessages((prev) => [...prev, mapRow(data)]);
              queueMicrotask(scrollToBottom);
            });
        })
        .subscribe();

      globalChatId = directChatId;
    } catch (err) {
      console.error("Error loading chat:", err);
    } finally {
      setLoading(false);
    }
  });

  const handleSendMessage = async (e: Event) => {
    console.log("🔥 handleSendMessage FIRED");
  e.preventDefault();
  const text = newMessage().trim();
  const uid = currentUserId();
  const cid = chatId();

  console.log("📤 handleSendMessage called", { textLen: text.length, uid, cid });

  if (!text || !uid || !cid) {
    console.warn("⛔ abort send (missing data)", { text, uid, cid });
    return;
  }

  setSending(true);

  try {
    const partnerId = Number((params as any).partnerId);
    console.log("👥 partnerId", partnerId);

    const { data, error } = await supabase
      .from("Messages")
      .insert({
        content: text,
        sender_id: uid,
        receiver_id: partnerId,
        chat_id: cid,
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
      .single()
      .returns<DbMessageRow>();

    // ✅ Debug: Raw response
    console.log("🧾 INSERT response", { data, error });

    if (error) throw error;
    if (!data) throw new Error("No data returned from insert");

    // ✅ Debug: check mapping correctness
    console.log("🔎 INSERT checks", {
      uid,
      returned_sender_id: data.sender_id,
      joined_sender: data.sender,
      joined_sender_id: data.sender?.id,
      joined_sender_name: data.sender ? `${data.sender.name} ${data.sender.surname}` : null,
      joined_sender_trustlevel: data.sender?.trustlevel,
      sender_id_matches_uid: data.sender_id === uid,
      joined_sender_id_matches_uid: data.sender?.id === uid,
    });

    const mapped = mapRow(data);
    console.log("🧩 mapped message", {
      mapped_sender_id: mapped.sender_id,
      mapped_user_id: mapped.User?.id,
      mapped_trustlevel: mapped.User?.trustlevel,
    });

    setMessages((prev) => [...prev, mapped]);
    setNewMessage("");
    queueMicrotask(scrollToBottom);
  } catch (err) {
    console.error("❌ Error sending message:", err);
    alert("Fehler beim Senden der Nachricht");
  } finally {
    setSending(false);
  }
};


  // optional debug
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
    loading,
    sending,
    handleSendMessage,
    formatTime,
    setMainContainerRef,
  };
}
