const KNOWN_ERROR_MESSAGES: Record<string, string> = {
  bad_backup: 'Die Datei konnte nicht gelesen werden oder ist keine valide Backup-Datei.',
  nickname_required: 'Bitte gib einen Nickname ein.',
  identity_not_available: 'Dein Konto konnte lokal nicht gespeichert werden. Bitte prüfe Browser-Speicher/Privatmodus und versuche es erneut.',
  register_failed: 'Konto konnte nicht erstellt werden. Bitte erneut versuchen.',
}

export function mapKnownErrorCodes(code: string): string {
  return KNOWN_ERROR_MESSAGES[code] ?? code
}

export function toUserMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error)
  return mapKnownErrorCodes(msg)
}

