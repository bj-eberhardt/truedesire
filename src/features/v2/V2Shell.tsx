import type { Dispatch, SetStateAction } from 'react'
import { useEffect, useMemo, useState } from 'react'
import '../../styles/v2.css'
import { goAsk, goPair, goPlayed, goV2, type V2RouteMode } from '../../app/routes'
import { Toast } from '../../components/Toast'
import { V2Footer } from './components/V2Footer'
import { V2Header } from './components/V2Header'
import type { PairingIncoming, PairingOutgoing, MyPairs } from '../../hooks/usePairing'
import type { MatchView } from '../../hooks/useMatches'
import type { AnswerChoice, DecryptedQuestion, PairView } from '../../types'
import { AskPage } from './pages/Ask'
import { HomePage } from './pages/Home'
import { PairPage } from './pages/Pair'
import { PlayedPage } from './pages/Played'

type V2ShellProps = {
  route: { mode: V2RouteMode; pairId: string | null }
  isBootstrappingAccount: boolean
  identity: { userId: string; nickname: string; code?: string | null } | null
  nickname: string
  onNicknameChange: (next: string) => void
  onRegister: () => Promise<void>
  onExportBackup: () => Promise<void>
  onImportBackup: () => Promise<void>
  onDeleteAccount: () => Promise<void>
  onImportBackupText: (txt: string) => Promise<void>

  pairingIncoming: PairingIncoming
  pairingOutgoing: PairingOutgoing
  myPairs: MyPairs
  pairingInlineError: string | null
  onClearPairingInlineError: () => void
  onSendPairRequest: (partnerCodeInput: string) => Promise<void>
  onRespondPairing: (requestId: string, action: 'accept' | 'reject' | 'cancel') => Promise<void>

  pair: PairView | null
  isLoadingPairData: boolean
  onOpenPair: (pairId: string) => Promise<void>
  onRefreshPairView: () => Promise<void>

  questions: DecryptedQuestion[]
  answerSummary: Record<string, { total: number; mine?: AnswerChoice }>
  onAnswer: (questionId: string, choice: AnswerChoice) => Promise<void>
  onAddQuestion: (text: string, selfAnswer: AnswerChoice) => Promise<void>

  matches: MatchView[]
  isLoadingMatches: boolean
  onComputeMatches: () => Promise<void>

  hiddenMatchIds: string[]
  setHiddenMatchIds: Dispatch<SetStateAction<string[]>>
  showHiddenMatches: boolean
  setShowHiddenMatches: Dispatch<SetStateAction<boolean>>
  visibleMatchesCount: number

  weeklyLimitInput: string
  setWeeklyLimitInput: (v: string) => void
  v2AllowAllQuestions: boolean
  setV2AllowAllQuestions: (v: boolean) => void
  isLoadingGroupSettings: boolean
  onRefreshGroupSettings: () => Promise<void>
  onProposeGroupSettings: () => Promise<void>
  onRespondGroupSettings: (action: 'accept' | 'reject' | 'cancel') => Promise<void>

  toast: { message: string; kind?: 'default' | 'success' | 'error' } | null
}

export function V2Shell(props: V2ShellProps) {
  const [v2CardIndex, setV2CardIndex] = useState(0)

  const apiReady = !!props.identity?.userId
  const routePairId = props.route.pairId
  const routeMode = props.route.mode

  // Deep-link: ensure pair is loaded when route targets a specific pair.
  useEffect(() => {
    if (!apiReady) return
    if (!routePairId) return
    if (routeMode !== 'pair' && routeMode !== 'ask' && routeMode !== 'played') return
    if (props.pair?.id === routePairId) return
    ;(async () => {
      try {
        await props.onOpenPair(routePairId)
      } catch {
        // ignore
      }
    })()
  }, [apiReady, props, routeMode, routePairId])

  // When questions change for the active pair, jump to the first unanswered item.
  useEffect(() => {
    if (!props.pair?.id) return
    const ordered = props.questions
      .slice()
      .sort((a, b) => {
        const am = props.answerSummary[a.id]?.mine ? 1 : 0
        const bm = props.answerSummary[b.id]?.mine ? 1 : 0
        if (am !== bm) return am - bm
        return b.createdAt - a.createdAt
      })
    const firstUnanswered = ordered.findIndex((q) => !props.answerSummary[q.id]?.mine)
    setV2CardIndex(Math.max(0, firstUnanswered >= 0 ? firstUnanswered : 0))
  }, [props.answerSummary, props.pair?.id, props.questions])

  const visibleMatchesCount = useMemo(() => props.visibleMatchesCount, [props.visibleMatchesCount])

  return (
    <div className="feature-shell v2-shell">
      <V2Header onExportBackup={props.onExportBackup} onImportBackup={props.onImportBackup} />
      <main className="v2">
        <div className="v2-shell">
        {routeMode === 'pair' && routePairId ? (
          <PairPage
            pairId={routePairId}
            identityUserId={props.identity?.userId ?? ''}
            pair={props.pair}
            questions={props.questions}
            answerSummary={props.answerSummary}
            isLoadingPairData={props.isLoadingPairData}
            onAnswer={props.onAnswer}
            v2CardIndex={v2CardIndex}
            onSetV2CardIndex={setV2CardIndex}
            onBack={goV2}
            onRefreshView={props.onRefreshPairView}
            onGoAsk={() => goAsk(routePairId)}
            onGoPlayed={() => goPlayed(routePairId)}
            matches={props.matches}
            isLoadingMatches={props.isLoadingMatches}
            onComputeMatches={props.onComputeMatches}
            hiddenMatchIds={props.hiddenMatchIds}
            setHiddenMatchIds={props.setHiddenMatchIds}
            showHiddenMatches={props.showHiddenMatches}
            setShowHiddenMatches={props.setShowHiddenMatches}
            visibleMatchesCount={visibleMatchesCount}
            weeklyLimitInput={props.weeklyLimitInput}
            setWeeklyLimitInput={props.setWeeklyLimitInput}
            v2AllowAllQuestions={props.v2AllowAllQuestions}
            setV2AllowAllQuestions={props.setV2AllowAllQuestions}
            isLoadingGroupSettings={props.isLoadingGroupSettings}
            onRefreshGroupSettings={props.onRefreshGroupSettings}
            onProposeGroupSettings={props.onProposeGroupSettings}
            onRespondGroupSettings={props.onRespondGroupSettings}
          />
        ) : routeMode === 'ask' && routePairId ? (
          <AskPage
            pairId={routePairId}
            pair={props.pair}
            onBack={() => goPair(routePairId)}
            onSave={async (text, selfAnswer) => {
              await props.onAddQuestion(text, selfAnswer)
              goPair(routePairId)
            }}
          />
        ) : routeMode === 'played' && routePairId ? (
          <PlayedPage
            pairId={routePairId}
            pair={props.pair}
            questions={props.questions}
            answerSummary={props.answerSummary}
            onBack={() => goPair(routePairId)}
            onAnswer={props.onAnswer}
          />
        ) : (
          <HomePage
            isBootstrappingAccount={props.isBootstrappingAccount}
            identity={props.identity}
            nickname={props.nickname}
            onNicknameChange={props.onNicknameChange}
            onRegister={props.onRegister}
            onExportBackup={props.onExportBackup}
            onDeleteAccount={props.onDeleteAccount}
            myPairs={props.myPairs}
            pairingIncoming={props.pairingIncoming}
            pairingOutgoing={props.pairingOutgoing}
            pairingInlineError={props.pairingInlineError}
            onClearPairingInlineError={props.onClearPairingInlineError}
            onSendPairRequest={props.onSendPairRequest}
            onRespondPairing={props.onRespondPairing}
            onOpenPair={async (pairId) => {
              goPair(pairId)
              setV2CardIndex(0)
              await props.onOpenPair(pairId)
            }}
            onImportBackupText={props.onImportBackupText}
          />
        )}
        </div>
      </main>
      {props.toast ? <Toast message={props.toast.message} kind={props.toast.kind} /> : null}
      <V2Footer />
    </div>
  )
}
