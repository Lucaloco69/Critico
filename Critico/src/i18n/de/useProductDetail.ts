export const dict = {
  unknownUserName: "Unbekannt",

  modal: {
    oneMomentTitle: "Einen Moment",
    oneMomentText: "Dein Konto oder das Produkt wird noch geladen. Bitte versuche es gleich nochmal.",

    ownProductTitle: "Eigenes Produkt",
    ownProductText: "Du kannst keine Testanfrage für dein eigenes Produkt stellen.",

    alreadyAcceptedTitle: "Bereits akzeptiert",
    alreadyAcceptedText: "Deine Anfrage wurde bereits akzeptiert! Du kannst jetzt kommentieren.",

    requestAlreadySentTitle: "Anfrage bereits gesendet",
    requestAlreadySentText: "Du hast bereits eine Anfrage für dieses Produkt gesendet!",

    requestSentTitle: "Anfrage gesendet",
    requestSentText: "Deine Anfrage wurde erfolgreich gesendet! Du wirst zum Chat weitergeleitet.",
    toChat: "Zum Chat",

    requestSendErrorTitle: "Fehler",
    requestSendErrorText: "Fehler beim Senden der Anfrage: {{ msg }}",

    noPermissionTitle: "Keine Berechtigung",
    noPermissionText: "Du hast keine Berechtigung, dieses Produkt zu kommentieren.",

    commentErrorTitle: "Fehler beim Kommentieren",
    unknownError: "Unbekannter Fehler",

    alreadyCommentedTitle: "Bereits kommentiert",
    alreadyCommentedText: "Du hast dieses Produkt bereits bewertet. Mehrfache Bewertungen sind nicht erlaubt.",
  },

  requestContent: 'Ich möchte gerne dein Produkt "{{ name }}" testen!',
} as const;
