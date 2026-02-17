export const dict = {
  statusRequest: "Wants to test this product",
  statusQrReady: "QR code created (activation required)",
  statusAccepted: "Activated (scan completed)",
  statusDeclined: "Request was declined",

  testerQrReadyHint: "A QR code was created and included in the package. You can comment after scanning it.",

  copyLink: "Copy link",
  print: "Print",
  accept: "✅ Accept",
  decline: "❌ Decline",
  processingDots: "...",

  qrLoading: "Loading QR…",
  qrAlt: "QR code",
  printHint: "Print this QR code and include it in the package. Access is unlocked after scanning.",

  noTokenFound: "No token found.",
  qrGenerateFailed: "Could not generate QR code.",

  trustlevelTitle: "Trust level {{ level }}",
} as const;
