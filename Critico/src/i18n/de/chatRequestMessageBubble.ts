export const dict = {
  // statusInfo().text
  statusRequest: "Möchte dieses Produkt testen",
  statusQrReady: "QR-Code wurde erstellt (Aktivierung nötig)",
  statusAccepted: "Aktiviert (Scan erfolgt)",
  statusDeclined: "Anfrage wurde abgelehnt",

  // tester hint when QR ready but not owner
  testerQrReadyHint: "QR-Code wurde erstellt und liegt dem Paket bei. Du kannst nach dem Scan kommentieren.",

  // buttons
  copyLink: "Link kopieren",
  print: "Drucken",
  accept: "✅ Akzeptieren",
  decline: "❌ Ablehnen",
  processingDots: "...",

  // QR area
  qrLoading: "QR wird geladen…",
  qrAlt: "QR Code",
  printHint: "Drucke diesen QR-Code aus und lege ihn dem Produkt bei. Freischaltung erfolgt nach Scan.",

  // errors
  noTokenFound: "Kein Token gefunden.",
  qrGenerateFailed: "QR konnte nicht erzeugt werden.",

  // misc
  trustlevelTitle: "Trustlevel {{ level }}",
} as const;
