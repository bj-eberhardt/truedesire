import { useState } from 'react'
import type { AnswerChoice, PairView } from '../../../types'

type AskPageProps = {
  pairId: string
  pair: PairView | null
  onBack: () => void
  onSave: (text: string, selfAnswer: AnswerChoice) => Promise<void>
}

export function AskPage(props: AskPageProps) {
  const [questionText, setQuestionText] = useState('')
  const [questionSelfAnswer, setQuestionSelfAnswer] = useState<AnswerChoice | null>(null)
  const [askError, setAskError] = useState<string | null>(null)

  const canSave = !!props.pair && props.pair.status === 'active' && !!questionText.trim() && !!questionSelfAnswer

  return (
    <section className="card v3-card v3-view">
      <div className="v3-view-head">
        <button className="secondary" onClick={props.onBack}>
          ← Zurück
        </button>
        <div>
          <h2 style={{ margin: 0 }}>Eigene Frage stellen</h2>
          <p className="hint v3-subtitle">Neue Frage erstellen und deine eigene Antwort direkt speichern.</p>
        </div>
      </div>

      <div className="divider" />

      <label className="field v3-field">
        <span>Frage</span>
        <input value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder="z.B. Möchtest du …" />
      </label>

      <div className="v3-choice-row" role="group" aria-label="Deine Antwort">
        <button type="button" className={`choice yes ${questionSelfAnswer === 'yes' ? 'active' : ''}`} onClick={() => setQuestionSelfAnswer('yes')}>
          Ja
        </button>
        <button type="button" className={`choice maybe ${questionSelfAnswer === 'maybe' ? 'active' : ''}`} onClick={() => setQuestionSelfAnswer('maybe')}>
          Vielleicht
        </button>
        <button type="button" className={`choice no ${questionSelfAnswer === 'no' ? 'active' : ''}`} onClick={() => setQuestionSelfAnswer('no')}>
          Nein
        </button>
      </div>

      <div className="v3-actions">
        <button
          className="primary"
          onClick={async () => {
            setAskError(null)
            const text = questionText.trim()
            if (!text) {
              setAskError('Bitte gib eine Frage ein.')
              return
            }
            if (!questionSelfAnswer) {
              setAskError('Bitte wähle Ja/Vielleicht/Nein.')
              return
            }
            try {
              await props.onSave(text, questionSelfAnswer)
            } catch (e: unknown) {
              setAskError(e instanceof Error ? e.message : String(e))
            }
          }}
          disabled={!canSave}
        >
          Speichern
        </button>
      </div>

      {askError ? <div className="inline-error">{askError}</div> : null}
    </section>
  )
}

