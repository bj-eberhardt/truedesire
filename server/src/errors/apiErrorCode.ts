export enum ApiErrorCode {
  BadRequest = "bad_request",
  Unauthorized = "unauthorized",
  Forbidden = "forbidden",
  NotFound = "not_found",
  InternalError = "internal_error",

  NicknameRequired = "nickname_required",
  NicknameTooLong = "nickname_too_long",
  BadEcdhPublic = "bad_ecdh_public",

  UnknownUser = "unknown_user",
  UnknownPartnerCode = "unknown_partner_code",
  CannotPairSelf = "cannot_pair_self",
  AlreadyLinked = "already_linked",
  RateLimited = "rate_limited",

  PairUsersMissing = "pair_users_missing",
  PairUserDeleted = "pair_user_deleted",
  PairNotCreated = "pair_not_created",
  PairFull = "pair_full",
  CannotJoinOwnPair = "cannot_join_own_pair",
  PairNotActive = "pair_not_active",
  PartnerDeleted = "partner_deleted",

  NoPendingProposal = "no_pending_proposal",
  CannotRespondOwnProposal = "cannot_respond_own_proposal",

  AlreadyAnswered = "already_answered",
  WeeklyLimitReached = "weekly_limit_reached",
  CannotUpdateAfterPartnerAnswer = "cannot_update_after_partner_answer",
  CannotDeleteAfterPartnerAnswer = "cannot_delete_after_partner_answer",

  SystemQuestionsUnavailable = "system_questions_unavailable",
  BadSystemQuestions = "bad_system_questions"
}
