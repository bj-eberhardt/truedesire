import '../styles/home.css'
import { goV1, goV2, goV3 } from './routes'

export function VersionHome() {
  return (
    <main className="home-shell">
      <section className="card">
        <h2>Start</h2>
        <p className="hint">Wähle eine UI-Version aus. Standard ist die neueste Version.</p>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button className="primary" onClick={goV3} title="Öffnet die neueste UI (Version 3)">
            Version 3 (Neu)
          </button>
          <button className="secondary" onClick={goV2} title="Öffnet Version 2">
            Version 2
          </button>
          <button className="secondary" onClick={goV1} title="Öffnet die Legacy UI (Version 1)">
            Version 1 (Legacy)
          </button>
        </div>
      </section>
    </main>
  )
}

