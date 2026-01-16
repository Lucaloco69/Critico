import { Show, createSignal } from "solid-js";


interface RequestMessage {
  id: number;
  content: string;
  created_at: string;
  sender_id: number;
  message_type: "request" | "request_accepted" | "request_declined";
  product_id?: number;
  sender: { // ✅ GEÄNDERT von "User" zu "sender"
    id: number;
    name: string;
    surname: string;
    picture: string | null;
    trustlevel?: number | null;
  } | null;
}


interface RequestMessageBubbleProps {
  message: RequestMessage;
  isOwn: boolean;
  isOwner: boolean; // Ist der aktuelle User der Product Owner?
  formatTime: (dateString: string) => string;
  onAccept?: (messageId: number, senderId: number, productId: number) => Promise<void>;
  onDecline?: (messageId: number) => Promise<void>;
}


export function RequestMessageBubble(props: RequestMessageBubbleProps) {
  const [processing, setProcessing] = createSignal(false);


  const handleAccept = async () => {
    if (!props.onAccept || !props.message.product_id) return;
    setProcessing(true);
    try {
      await props.onAccept(props.message.id, props.message.sender_id, props.message.product_id);
    } finally {
      setProcessing(false);
    }
  };


  const handleDecline = async () => {
    if (!props.onDecline) return;
    setProcessing(true);
    try {
      await props.onDecline(props.message.id);
    } finally {
      setProcessing(false);
    }
  };


  const getStatusInfo = () => {
    switch (props.message.message_type) {
      case "request":
        return {
          icon: "🔔",
          text: "Möchte dieses Produkt testen",
          bgColor: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
          textColor: "text-amber-900 dark:text-amber-100"
        };
      case "request_accepted":
        return {
          icon: "✅",
          text: "Anfrage wurde akzeptiert",
          bgColor: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
          textColor: "text-green-900 dark:text-green-100"
        };
      case "request_declined":
        return {
          icon: "❌",
          text: "Anfrage wurde abgelehnt",
          bgColor: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
          textColor: "text-red-900 dark:text-red-100"
        };
    }
  };


  const statusInfo = getStatusInfo();
  
  // ✅ Helper für Trustlevel
  const tl = () => props.message.sender?.trustlevel;


  return (
    <div class={`flex ${props.isOwn ? "justify-end" : "justify-start"}`}>
      <div class={`flex gap-2 max-w-[70%] ${props.isOwn ? "flex-row-reverse" : ""}`}>
        {/* Avatar mit Trustlevel Badge */}
        <div class="relative w-8 h-8 flex-shrink-0">
          <div class="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
            {props.message.sender?.name?.charAt(0) ?? "?"} {/* ✅ GEÄNDERT */}
          </div>
          
          {/* Trustlevel Badge */}
          <Show when={tl() != null}>
            <div
              class="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] leading-[16px] text-center font-semibold bg-black/70 text-white"
              title={`Trustlevel ${tl()}`}
            >
              {tl()}
            </div>
          </Show>
        </div>
        
        <div>
          <div class={`px-4 py-3 rounded-2xl shadow-md border-2 ${statusInfo.bgColor}`}>
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xl">{statusInfo.icon}</span>
              <span class={`font-semibold ${statusInfo.textColor}`}>
                {statusInfo.text}
              </span>
            </div>
            
            <p class={`text-sm ${statusInfo.textColor} opacity-80`}>
              {props.message.content}
            </p>


            {/* Accept/Decline Buttons - nur für Owner bei pending requests */}
            <Show when={props.message.message_type === "request" && props.isOwner && !props.isOwn}>
              <div class="flex gap-2 mt-3 pt-3 border-t border-amber-200 dark:border-amber-800">
                <button
                  onClick={handleAccept}
                  disabled={processing()}
                  class="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
                >
                  {processing() ? "..." : "✅ Akzeptieren"}
                </button>
                <button
                  onClick={handleDecline}
                  disabled={processing()}
                  class="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
                >
                  {processing() ? "..." : "❌ Ablehnen"}
                </button>
              </div>
            </Show>
          </div>


          <p class={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${props.isOwn ? "text-right" : ""}`}>
            {props.formatTime(props.message.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
}
