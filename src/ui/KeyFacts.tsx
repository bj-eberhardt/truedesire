type Fact = {
  title: string;
  body: string;
};

const FACTS: Fact[] = [
  {
    title: "Ende-zu-Ende verschlüsselt",
    body: "Fragen und Antworten werden im Browser verschlüsselt. Der Server speichert nur Ciphertext."
  },
  {
    title: "Ohne E-Mail/Passwort",
    body: "Dein Gerät hält die privaten Schlüssel. Mit Backup kannst du auf einem neuen Gerät wieder einsteigen."
  },
  {
    title: "Pairing per Code",
    body: "Nur wer deinen Pairing-Code kennt, kann dir Anfragen schicken. Dein Nickname ist dabei sichtbar."
  },
  {
    title: "Weekly Limit",
    body: "Nur das Antworten ist pro Woche limitiert. Fragen hinzufügen ist unbegrenzt."
  }
];

export function KeyFacts(props: { onClose?: () => void }) {
  return (
    <section className="facts">
      <div className="facts-head">
        <h2>Key Facts</h2>
        {props.onClose ? (
          <button
            type="button"
            className="facts-close secondary"
            onClick={props.onClose}
            aria-label="Key Facts schließen"
          >
            ×
          </button>
        ) : null}
      </div>
      <div className="facts-grid">
        {FACTS.map((f) => (
          <div className="fact" key={f.title}>
            <div className="fact-title">{f.title}</div>
            <div className="fact-body">{f.body}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
