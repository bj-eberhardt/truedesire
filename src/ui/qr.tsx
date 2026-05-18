import { useState } from 'react'

export function QrInvite({ value }: { value: string }) {
    return (
        <div className="card">
            <div className="hint">QR derzeit nicht verfügbar. Bitte Pairing-Code manuell teilen:</div>
            <div className="mono">{value}</div>
        </div>
    )
}

export function QrScanner({ onValue }: { onValue: (text: string) => void | Promise<void> }) {
    const [text, setText] = useState('')
    return (
        <div className="field">
            <span>QR-Inhalt manuell einfügen</span>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} />
            <button onClick={() => onValue(text)}>Übernehmen</button>
        </div>
    )
}
