export const dict = {
  statusRequest: "Möchte dieses Produkt testen",
  statusQrReady: "QR-Code wurde erstellt (Aktivierung nötig)",
  statusAccepted: "Aktiviert (Scan erfolgt)",
  statusDeclined: "Anfrage wurde abgelehnt",

  testerQrReadyHint: "QR-Code wurde erstellt und liegt dem Paket bei. Du kannst nach dem Scan kommentieren.",

  copyLink: "Link kopieren",
  print: "Drucken",
  accept: "✅ Akzeptieren",
  decline: "❌ Ablehnen",
  processingDots: "...",

  qrLoading: "QR wird geladen…",
  qrAlt: "QR Code",
  printHint: "Drucke diesen QR-Code aus und lege ihn dem Produkt bei. Freischaltung erfolgt nach Scan.",

  noTokenFound: "Kein Token gefunden.",
  qrGenerateFailed: "QR konnte nicht erzeugt werden.",

  trustlevelTitle: "Trustlevel {{ level }}",
} as const;
