export const dict = {
  unknownUserName: "Unknown",

  modal: {
    oneMomentTitle: "One moment",
    oneMomentText: "Your account or the product is still loading. Please try again in a moment.",

    ownProductTitle: "Own product",
    ownProductText: "You can’t request to test your own product.",

    alreadyAcceptedTitle: "Already accepted",
    alreadyAcceptedText: "Your request has already been accepted! You can comment now.",

    requestAlreadySentTitle: "Request already sent",
    requestAlreadySentText: "You’ve already sent a request for this product!",

    requestSentTitle: "Request sent",
    requestSentText: "Your request was sent successfully! You’ll be redirected to the chat.",
    toChat: "Go to chat",

    requestSendErrorTitle: "Error",
    requestSendErrorText: "Error while sending the request: {{ msg }}",

    noPermissionTitle: "No permission",
    noPermissionText: "You don’t have permission to comment on this product.",

    commentErrorTitle: "Error while commenting",
    unknownError: "Unknown error",
  },

  requestContent: 'I’d like to test your product "{{ name }}"!',
} as const;
