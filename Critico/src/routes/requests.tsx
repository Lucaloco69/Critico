import { createSignal, createEffect, For, Show, onCleanup } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { supabase } from "../lib/supabaseClient";
import sessionStore, { isLoggedIn } from "../lib/sessionStore";

interface Request {
  id: number;
  sender_id: number;
  product_id: number;
  status: string | null;
  created_at: string;
  Sender: {
    id: number;
    name: string;
    surname: string;
    picture: string | null;
  };
  Product: {
    id: number;
    name: string;
    picture: string | null;
    owner_id: number;
  };
}

export default function Requests() {
  const navigate = useNavigate();
  
  const [requests, setRequests] = createSignal<Request[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [currentUserId, setCurrentUserId] = createSignal<number | null>(null);

  // Redirect wenn nicht eingeloggt
  createEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login", { replace: true });
    }
  });

  // Lade User-ID
  createEffect(async () => {
    if (!sessionStore.user) return;

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

  // Lade Anfragen wenn User-ID vorhanden
  createEffect(() => {
    const userId = currentUserId();
    if (!userId) return;

    loadRequests(userId);

    // Realtime Subscription
    const channel = supabase
      .channel("requests_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Requests",
        },
        () => {
          loadRequests(userId);
        }
      )
      .subscribe();

    onCleanup(() => {
      supabase.removeChannel(channel);
    });
  });

  const loadRequests = async (userId: number) => {
  try {
    setLoading(true);

    const { data, error } = await supabase
      .from("Requests")
      .select(`
        id,
        sender_id,
        product_id,
        status,
        created_at,
        Sender:User!sender_id (
          id,
          name,
          surname,
          picture
        ),
        Product!product_id (
          id,
          name,
          owner_id
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    console.log("📋 All requests:", data);

    // Filtere: Nur Anfragen für MEINE Produkte
    const myRequests = (data || []).filter(
      (r: any) => r.Product && r.Product.owner_id === userId
    );

    console.log("✅ My requests:", myRequests);
    setRequests(myRequests as any);
  } catch (err) {
    console.error("Error loading requests:", err);
  } finally {
    setLoading(false);
  }
};


  // Grant Comment Permission nach akzeptiertem Request
  const grantCommentPermission = async (userId: number, productId: number) => {
    try {
      const { error } = await supabase
        .from("ProductComments_User")
        .insert({ 
          user_id: userId, 
          product_id: productId 
        });

      if (error) {
        // 23505 = unique constraint (bereits vorhanden) → OK, nicht fatal
        if (error.code === "23505") {
          console.log("ℹ️ Comment permission already exists");
          return;
        }
        
        // Anderer Fehler → Werfen
        console.error("❌ Error granting comment permission:", error);
        throw error;
      }

      console.log("✅ Comment permission granted for user", userId, "on product", productId);
    } catch (err) {
      console.error("💥 Failed to grant permission:", err);
      throw err; // Re-throw damit handleAccept den Fehler catcht
    }
  };

  // Anfrage annehmen
  const handleAccept = async (requestId: number) => {
    try {
      // Finde den Request einmal (nicht mehrfach)
      const request = requests().find(r => r.id === requestId);
      if (!request) {
        console.error("Request not found");
        return;
      }

      // 1. Update Request Status in DB
      const { error } = await supabase
        .from("Requests")
        .update({ status: "accepted" })
        .eq("id", requestId);

      if (error) throw error;

      // 2. Grant Comment Permission (mit await!)
      await grantCommentPermission(request.sender_id, request.product_id);

      // 3. Update local state
      setRequests(requests().map(r => 
        r.id === requestId ? { ...r, status: "accepted" } : r
      ));

      console.log("✅ Request accepted and permission granted");
    } catch (err) {
      console.error("Error accepting request:", err);
      alert("Fehler beim Annehmen der Anfrage.");
    }
  };

  // Anfrage ablehnen
  const handleDecline = async (requestId: number) => {
    try {
      const { error } = await supabase
        .from("Requests")
        .update({ status: "declined" })
        .eq("id", requestId);

      if (error) throw error;

      // Update local state
      setRequests(requests().map(r => 
        r.id === requestId ? { ...r, status: "declined" } : r
      ));
    } catch (err) {
      console.error("Error declining request:", err);
      alert("Fehler beim Ablehnen der Anfrage.");
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const pendingRequests = () => requests().filter(r => r.status === null);
  const answeredRequests = () => requests().filter(r => r.status !== null);

  return (
    <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header class="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <A href="/home" class="text-2xl font-bold text-sky-600 dark:text-sky-400">
            Critico
          </A>
        </div>
      </header>

      <main class="max-w-5xl mx-auto px-4 py-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Produktanfragen
        </h1>

        <Show when={loading()}>
          <div class="flex justify-center items-center py-20">
            <div class="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </Show>

        <Show when={!loading()}>
          {/* Offene Anfragen */}
          <div class="mb-8">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <svg class="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Offene Anfragen ({pendingRequests().length})
            </h2>

            <Show when={pendingRequests().length === 0}>
              <div class="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
                <svg class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p class="text-gray-500 dark:text-gray-400">Keine offenen Anfragen</p>
              </div>
            </Show>

            <div class="space-y-4">
              <For each={pendingRequests()}>
                {(request) => (
                  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
                    <div class="flex items-start gap-4">
                      {/* Produkt Bild */}
                      <div class="w-24 h-24 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                        <Show
                          when={request.Product.picture}
                          fallback={
                            <div class="w-full h-full flex items-center justify-center">
                              <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          }
                        >
                          <img
                            src={request.Product.picture!}
                            alt={request.Product.name}
                            class="w-full h-full object-cover"
                          />
                        </Show>
                      </div>

                      {/* Info */}
                      <div class="flex-1 min-w-0">
                        <h3 class="font-semibold text-gray-900 dark:text-white text-lg mb-1">
                          {request.Product.name}
                        </h3>
                        <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <div class="w-8 h-8 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                            {request.Sender.name.charAt(0)}
                          </div>
                          <span>
                            <span class="font-medium text-gray-900 dark:text-white">
                              {request.Sender.name} {request.Sender.surname}
                            </span>
                            {" "}möchte dieses Produkt testen
                          </span>
                        </div>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(request.created_at)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div class="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleAccept(request.id)}
                          class="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                        >
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                          </svg>
                          Annehmen
                        </button>
                        <button
                          onClick={() => handleDecline(request.id)}
                          class="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                        >
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Ablehnen
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>

          {/* Beantwortete Anfragen */}
          <div>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Beantwortete Anfragen ({answeredRequests().length})
            </h2>

            <Show when={answeredRequests().length === 0}>
              <div class="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
                <p class="text-gray-500 dark:text-gray-400">Keine beantworteten Anfragen</p>
              </div>
            </Show>

            <div class="space-y-4">
              <For each={answeredRequests()}>
                {(request) => (
                  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 opacity-75">
                    <div class="flex items-start gap-4">
                      {/* Produkt Bild */}
                      <div class="w-20 h-20 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                        <Show
                          when={request.Product.picture}
                          fallback={
                            <div class="w-full h-full flex items-center justify-center">
                              <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          }
                        >
                          <img
                            src={request.Product.picture!}
                            alt={request.Product.name}
                            class="w-full h-full object-cover"
                          />
                        </Show>
                      </div>

                      {/* Info */}
                      <div class="flex-1">
                        <h3 class="font-semibold text-gray-900 dark:text-white mb-1">
                          {request.Product.name}
                        </h3>
                        <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {request.Sender.name} {request.Sender.surname}
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(request.created_at)}
                        </p>
                      </div>

                      {/* Status Badge */}
                      <div class="flex-shrink-0">
                        <Show when={request.status === "accepted"}>
                          <span class="px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg font-semibold text-sm flex items-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                            </svg>
                            Angenommen
                          </span>
                        </Show>
                        <Show when={request.status === "declined"}>
                          <span class="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg font-semibold text-sm flex items-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Abgelehnt
                          </span>
                        </Show>
                      </div>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>
      </main>
    </div>
  );
}
