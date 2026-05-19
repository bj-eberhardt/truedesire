import type { AnswerChoice, DecryptedQuestion, PairView } from '../../../types'
import { useEffect, useRef, useState } from 'react'

type PlayedPageProps = {
  pairId: string
  pair: PairView | null
  questions: DecryptedQuestion[]
  answerSummary: Record<string, { total: number; mine?: AnswerChoice }>
  onBack: () => void
  onAnswer: (questionId: string, choice: AnswerChoice) => Promise<void>
}

export function PlayedPage(props: PlayedPageProps) {
  const [isAnswering, setIsAnswering] = useState(false)
  const [savedQuestionId, setSavedQuestionId] = useState<string | null>(null)
  const [savedQuestionText, setSavedQuestionText] = useState<string | null>(null)
  const [showSaved, setShowSaved] = useState(false)
  const savedTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current)
    }
  }, [])

  async function handleAnswer(questionId: string, questionText: string, choice: AnswerChoice) {
    if (isAnswering) return
    try {
      setIsAnswering(true)
      setSavedQuestionId(questionId)
      setSavedQuestionText(questionText)
      await props.onAnswer(questionId, choice)
      setShowSaved(true)
      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current)
      savedTimerRef.current = window.setTimeout(() => {
        setShowSaved(false)
        setIsAnswering(false)
        setSavedQuestionId(null)
        setSavedQuestionText(null)
      }, 650)
    } catch {
      setIsAnswering(false)
      setShowSaved(false)
      setSavedQuestionId(null)
      setSavedQuestionText(null)
    }
  }

  return (
    <section className="card v3-card v3-view">
      <div className="v3-view-head">
        <button className="secondary" onClick={props.onBack}>
          ← Zurück
        </button>
        <div>
          <h2 style={{ margin: 0 }}>Deine änderbaren Antworten</h2>
          <p className="hint v3-subtitle">
            Du kannst Antworten hier noch anpassen, solange dein Partner die gleiche Frage noch nicht beantwortet hat.
          </p>
        </div>
      </div>
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
            <div className="v3-played-list">
              {pending.map((pq) => {
                const mine = props.answerSummary[pq.id]?.mine
                const total = props.answerSummary[pq.id]?.total ?? 0
                const locked = total >= 2
                const isSavedCard = showSaved && savedQuestionId === pq.id
                return (
                  <div className="v3-play-card" key={pq.id} data-saved={isSavedCard ? 'true' : 'false'}>
                    <div className="v3-play-question">{isSavedCard ? savedQuestionText ?? pq.text : pq.text}</div>
                    {isSavedCard ? <div className="v3-answer-saved">Antwort wurde gespeichert.</div> : null}
                    <div className="v3-choice-row">
                      <button
                        className={`choice yes ${mine === 'yes' ? 'active' : ''}`}
                        onClick={() => handleAnswer(pq.id, pq.text, 'yes')}
                        disabled={locked || isAnswering}
                      >
                        Ja
                      </button>
                      <button
                        className={`choice maybe ${mine === 'maybe' ? 'active' : ''}`}
                        onClick={() => handleAnswer(pq.id, pq.text, 'maybe')}
                        disabled={locked || isAnswering}
                      >
                        Vielleicht
                      </button>
                      <button
                        className={`choice no ${mine === 'no' ? 'active' : ''}`}
                        onClick={() => handleAnswer(pq.id, pq.text, 'no')}
                        disabled={locked || isAnswering}
                      >
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
