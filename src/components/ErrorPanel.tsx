type ErrorPanelProps = {
  error: string;
};

export function ErrorPanel({ error }: ErrorPanelProps) {
  return (
    <section className="card error" data-testid="app-error-panel">
      <h2>Fehler</h2>
      <pre className="pre" data-testid="app-error-message">
        {error}
      </pre>
    </section>
  );
}
