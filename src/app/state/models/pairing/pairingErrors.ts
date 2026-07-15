const PAIRING_INLINE_ERRORS: Record<string, string> = {
  unknown_partner_code: "Unbekannter Partner-Code. Bitte prüfen (Großbuchstaben/Zahlen).",
  already_linked: "Mit diesem Partner besteht bereits eine Verknüpfung.",
  rate_limited: "Zu viele Versuche in kurzer Zeit. Bitte warte kurz und versuche es erneut."
};

export function pairingInlineErrorFor(code: string): string | null {
  return PAIRING_INLINE_ERRORS[code] ?? null;
}

