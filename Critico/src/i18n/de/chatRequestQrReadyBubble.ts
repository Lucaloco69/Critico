export const dict = {
  // Non-owner compact view
  compactText: "QR-Code wurde erstellt (Aktivierung nötig)",

  // Owner view header
  title: "QR-Code wurde erstellt (Aktivierung nötig)",
  subtitle: "Drucke diesen QR-Code aus und lege ihn dem Paket bei. Freischaltung erfolgt nach Scan.",

  // Errors / loading
  noTokenFound: "Kein Token gefunden.",
  qrCreateFailed: "QR-Code konnte nicht erstellt werden.",
  qrGeneratingFailedLog: "QR-Code Generierung fehlgeschlagen:",
  copyFailedLog: "Kopieren fehlgeschlagen:",
  qrLoading: "QR wird geladen…",

  // QR / link labels
  qrAlt: "QR Code für Produktaktivierung",
  activationLinkLabel: "Aktivierungs-Link:",
  instructionsLabel: "Anleitung:",
  instructionsText: "Lege ihn bitte dem Paket bei. Wird nach Scan freigeschaltet.",

  // Buttons
  copyLink: "Link kopieren",
  copied: "Kopiert!",
  print: "Drucken",
} as const;
