import { createEffect, onCleanup } from "solid-js";
import { supabase } from "../lib/supabaseClient";
import { messagesStore } from "../lib/messagesStore";
import { RealtimePostgresChangesPayload, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import { Message } from "../types/messages";

export function useChatSubscription(chatId: () => number | null, userId: () => number | null) {

    createEffect(() => {
        const currentChatId = chatId();
        const currentUserId = userId();

        if (!currentChatId || !currentUserId) return;



        const channel = supabase.channel(`chat-messages-${currentChatId}`, {
            config: {
                broadcast: { self: true, ack: true }
            }
        });

        channel
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "Messages",
                    filter: `chat_id=eq.${currentChatId}`,
                },
                async (payload: RealtimePostgresChangesPayload<Message>) => {
                    const newMessage = payload.new as Message;

                    // If we sent it (optimistic update handled locally), we might want to skip or update
                    // But since we use upsertMessage, it should be fine to update the temporary ID or confirm it.
                    // Ideally, the backend would return the real ID.

                    // For now, let's just fetch the full message details because payload might miss joins (sender, product)
                    // Realtime payload acts as a trigger.
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
                product:Product ( id, owner_id ),
                sender:User!Messages_sender_id_fkey (
                  id, name, surname, picture, trustlevel
                )
             `)
                        .eq("id", newMessage.id)
                        .single();

                    if (data && !error) {
                        // Convert to Message type compatible (handle potential nulls from join)
                        messagesStore.upsertMessage(data as unknown as Message);
                        if (data.sender_id !== currentUserId) {
                            messagesStore.markChatAsRead(currentChatId, currentUserId);
                        }
                    }
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "Messages",
                    filter: `chat_id=eq.${currentChatId}`,
                },
                async (payload: RealtimePostgresChangesPayload<Message>) => {
                    const updatedMessage = payload.new as Message;

                    // Fetch full details again to be safe with relations
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
                product:Product ( id, owner_id ),
                sender:User!Messages_sender_id_fkey (
                  id, name, surname, picture, trustlevel
                )
             `)
                        .eq("id", updatedMessage.id)
                        .single();

                    if (data && !error) {
                        messagesStore.updateMessage(data as unknown as Message);
                    }
                }
            )
            .on(
                "broadcast",
                { event: "message_updated" },
                (payload: { payload: { messageId: number; chatId: number; newType?: string } }) => {
                    const { messageId, chatId: updatedChatId } = payload.payload;

                    if (updatedChatId === currentChatId) {
                        // Fetch the updated message
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
                    product:Product ( id, owner_id ),
                    sender:User!Messages_sender_id_fkey (
                      id, name, surname, picture, trustlevel
                    )
                 `)
                            .eq("id", messageId)
                            .single()
                            .then(({ data }) => {
                                if (data) messagesStore.updateMessage(data as unknown as Message);
                            });
                    }
                }
            )
            .subscribe((status) => {
            });

        onCleanup(() => {
            supabase.removeChannel(channel);
        });
    });

    return {};
}
