export type AnswerChoice = 'yes' | 'no' | 'maybe'

export type EncryptedBlob = {
  ciphertextB64: string
  ivB64: string
  aadB64: string
  schemaVersion: number
}

export type PairUserView = {
  id: string
  code?: string
  nickname: string
  ecdhPublicRawB64: string
}

export type PairView = {
  id: string
  status: 'pending' | 'active'
  weeklyLimit: number
  weeklyLimitPending?: { id: string; proposedBy: string; limit: number; createdAt: number } | null
  seededSystemQuestionsAt?: number | null
  usage?: { answeredThisWeek: number; weeklyLimit: number }
  partnerDeleted?: boolean
  confirmA: boolean
  confirmB: boolean
  me: PairUserView
  partner: PairUserView | null
}

export type QuestionView = {
  id: string
  pairId: string
  createdBy: string
  createdAt: number
  blob: EncryptedBlob
}

export type AnswerView = {
  id: string
  questionId: string
  pairId: string
  userId: string
  createdAt: number
  blob: EncryptedBlob
}

export type DecryptedQuestion = QuestionView & { text: string }
