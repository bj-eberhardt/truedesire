import type { AnswerChoice, DecryptedQuestion, PairView } from '../../../types'

type PlayedPageProps = {
  pairId: string
  pair: PairView | null
  questions: DecryptedQuestion[]
  answerSummary: Record<string, { total: number; mine?: AnswerChoice }>
  onBack: () => void
  onAnswer: (questionId: string, choice: AnswerChoice) => Promise<void>
}

export function PlayedPage(props: PlayedPageProps) {
  return (
    <section className="card v2-detail v2-view">
      <div className="row">
        <button className="secondary" onClick={props.onBack}>
          ← Zurück
        </button>
        <h2 style={{ margin: 0 }}>Deine Antworten, Partner noch offen</h2>
      </div>
      <p className="hint v2-view-subtitle">Hier siehst du nur Fragen, die du bereits beantwortet hast, aber dein Partner noch nicht.</p>
      <div className="divider" />
      {!props.pair || props.pair.id !== props.pairId ? (
        <div className="empty">Verknüpfung wird geladen…</div>
      ) : (
        (() => {
          const pending = props.questions
            .filter((q) => (props.answerSummary[q.id]?.total ?? 0) < 2 && !!props.answerSummary[q.id]?.mine)
            .sort((a, b) => b.createdAt - a.createdAt)
          if (!pending.length) return <div className="empty">Du hast aktuell keine Antworten mit offenem Partner-Status.</div>
          return (
            <div className="played-list played-page">
              {pending.map((pq) => {
                const mine = props.answerSummary[pq.id]?.mine
                const total = props.answerSummary[pq.id]?.total ?? 0
                const locked = total >= 2
                return (
                  <div className="play-card answered" key={pq.id}>
                    <div className="row play-top">
                      <div className="pill mono">Von dir beantwortet</div>
                      <div className="hint mono">Antworten: {total}/2</div>
                    </div>
                    <div className="play-question">{pq.text}</div>
                    <div className="row play-actions">
                      <button className={`choice yes ${mine === 'yes' ? 'active' : ''}`} onClick={() => props.onAnswer(pq.id, 'yes')} disabled={locked}>
                        Ja
                      </button>
                      <button className={`choice maybe ${mine === 'maybe' ? 'active' : ''}`} onClick={() => props.onAnswer(pq.id, 'maybe')} disabled={locked}>
                        Vielleicht
                      </button>
                      <button className={`choice no ${mine === 'no' ? 'active' : ''}`} onClick={() => props.onAnswer(pq.id, 'no')} disabled={locked}>
                        Nein
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()
      )}
    </section>
  )
}

