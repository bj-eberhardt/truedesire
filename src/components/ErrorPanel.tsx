type ErrorPanelProps = {
  error: string
}

export function ErrorPanel({ error }: ErrorPanelProps) {
  return (
    <section className="card error">
      <h2>Fehler</h2>
      <pre className="pre">{error}</pre>
    </section>
  )
}

