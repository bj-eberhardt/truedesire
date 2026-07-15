import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useAccountContext,
  usePairingContext,
  usePairWorkspaceContext,
  useSessionContext
} from "../../../app/state";
import { ProfileAvatar } from "../../../components/ProfileAvatar";
import { RefreshButton } from "../../../components/RefreshButton";
import { V3Notice } from "../components/V3Notice";
import { ClipboardIcon } from "../components/icons/ClipboardIcon";
import { CodeExchangeIcon } from "../components/icons/CodeExchangeIcon";
import { InfoIcon } from "../components/icons/InfoIcon";

function scrollToSection(ref: React.RefObject<HTMLElement | null>) {
  const el = ref.current;
  if (!el) return;
  // Prefer scrollIntoView so it works with scroll containers (not only window).
  try {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  } catch {
    // fall back to window scrolling
  }
  const top = el.getBoundingClientRect().top + window.scrollY - 92;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

export function AccountHomePage() {
  const { identity } = useSessionContext();
  const account = useAccountContext();
  const pairing = usePairingContext();
  const workspace = usePairWorkspaceContext();
  const [partnerCodeInput, setPartnerCodeInput] = useState("");
  const [pairingRequestsLastCheckedAt, setPairingRequestsLastCheckedAt] = useState<number | null>(
    null
  );
  const [pairingRequestsNextCheckAt, setPairingRequestsNextCheckAt] = useState(
    () => Date.now() + 30_000
  );
  const [pairingRequestsNow, setPairingRequestsNow] = useState(() => Date.now());
  const [isRefreshingPairingRequests, setIsRefreshingPairingRequests] = useState(false);
  const pairingRequestsRefreshInFlightRef = useRef(false);

  const hasIdentity = !!identity?.userId;
  const pairingRequestsSecondsUntilRefresh = Math.max(
    0,
    Math.ceil((pairingRequestsNextCheckAt - pairingRequestsNow) / 1000)
  );
  const pairingRequestsLastCheckedLabel = pairingRequestsLastCheckedAt
    ? new Date(pairingRequestsLastCheckedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      })
    : "noch nicht geprüft";

  const refreshPairingRequestsOnly = useCallback(async () => {
    if (!hasIdentity) return;
    if (pairingRequestsRefreshInFlightRef.current) return;
    pairingRequestsRefreshInFlightRef.current = true;
    setIsRefreshingPairingRequests(true);
    try {
      await pairing.refreshRequests();
      setPairingRequestsLastCheckedAt(Date.now());
    } finally {
      pairingRequestsRefreshInFlightRef.current = false;
      setIsRefreshingPairingRequests(false);
      setPairingRequestsNextCheckAt(Date.now() + 30_000);
    }
  }, [hasIdentity, pairing]);

  useEffect(() => {
    if (!hasIdentity) return;
    const interval = window.setInterval(() => {
      const now = Date.now();
      setPairingRequestsNow(now);
      if (now >= pairingRequestsNextCheckAt) void refreshPairingRequestsOnly();
    }, 1000);
    return () => window.clearInterval(interval);
  }, [hasIdentity, pairingRequestsNextCheckAt, refreshPairingRequestsOnly]);
  const groupedRequests = useMemo(() => {
    const grouped = new Map<
      string,
      { nickname: string; code: string; incomingIds: string[]; outgoingIds: string[] }
    >();
    for (const r of pairing.incoming) {
      const key = `${r.from.code}|${r.from.nickname}`;
      const existing = grouped.get(key) ?? {
        nickname: r.from.nickname,
        code: r.from.code,
        incomingIds: [],
        outgoingIds: []
      };
      existing.incomingIds.push(r.id);
      grouped.set(key, existing);
    }
    for (const r of pairing.outgoing) {
      const key = `${r.to.code}|${r.to.nickname}`;
      const existing = grouped.get(key) ?? {
        nickname: r.to.nickname,
        code: r.to.code,
        incomingIds: [],
        outgoingIds: []
      };
      existing.outgoingIds.push(r.id);
      grouped.set(key, existing);
    }
    return Array.from(grouped.entries())
      .sort((a, b) => a[1].nickname.localeCompare(b[1].nickname, "de"))
      .map(([, row]) => row);
  }, [pairing.incoming, pairing.outgoing]);

  const requestsPanelRef = useRef<HTMLElement | null>(null);

  const visiblePairs = pairing.myPairs.filter((p) => !p.partnerDeleted);
  const hasPairs = visiblePairs.length > 0;
  const hasRequests = groupedRequests.length > 0;

  return (
    <div className="v3-home-stack" data-testid="home-view">
      {hasRequests ? (
        <V3Notice
          icon={<InfoIcon />}
          title="Offene Verknüpfungen vorhanden"
          hint="Tippe hier, um die Anfragen anzusehen."
          onClick={() => scrollToSection(requestsPanelRef)}
        />
      ) : null}

      {hasPairs ? (
        <section className="card v3-card v3-panel" data-testid="partners-panel">
          <h2>Deine Partner</h2>
          <p className="hint">
            Du hast bereits folgende verknüpfte Partner. Tippe auf einen Partner, um die Fragen zu
            öffnen.
          </p>
          <div className="v3-pair-grid">
            {visiblePairs.map((p) => (
              <button
                key={p.id}
                className="v3-pair-card"
                data-testid="partner-card"
                data-pair-id={p.id}
                data-partner-name={p.partner?.nickname ?? p.id}
                onClick={async () => {
                  workspace.openPairRoute(p.id);
                }}
              >
                <div className="v3-pair-card-main">
                  <ProfileAvatar name={p.partner?.nickname ?? "?"} />
                  <div>
                    <div className="v3-pair-card-name">{p.partner?.nickname ?? p.id}</div>
                    <div className="v3-pair-card-code mono">{p.partner?.code ?? "—"}</div>
                  </div>
                </div>
                <div
                  className={`pill mono status ${p.status === "active" ? "ok" : p.status === "ended" ? "ended" : "pending"}`}
                >
                  {p.partnerDeleted
                    ? "gelöscht"
                    : p.status === "active"
                      ? "aktiv"
                      : p.status === "ended"
                        ? "beendet"
                        : "ausstehend"}
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {!hasPairs ? (
        <section className="card v3-card v3-panel v3-guide">
          <div className="v3-guide-head">
            <CodeExchangeIcon />
            <div className="v3-guide-text">
              <h2>So verknüpft ihr euch</h2>
              <p className="hint">
                Eine Person sendet eine Anfrage an den Pairing-Code des Partners. Sobald der Partner
                annimmt, seid ihr verknüpft.
              </p>
            </div>
          </div>
          <ol className="v3-guide-steps">
            <li>
              Frag deinen Partner nach seinem <strong>Pairing-Code</strong>.
            </li>
            <li>
              Teile deinem Partner deinen <strong>Pairing-Code</strong> (
              <span className="v3-guide-code mono">{identity?.code ?? "—"}</span>) mit.
              <button
                type="button"
                className="v3-copy-code-button"
                data-testid="guide-copy-pairing-code-button"
                aria-label="Pairing-Code kopieren"
                disabled={!identity?.code}
                onClick={() => account.copyPairingCode()}
              >
                <ClipboardIcon />
              </button>
            </li>
            <li>
              Eine Person sendet die Anfrage. Der Partner nimmt sie an, dann wird die Verknüpfung
              aktiv.
            </li>
            <li>
              Wenn ihr verbunden seid, könnt ihr euch gegenseitig Fragen ausspielen und Antworten
              sehen.
            </li>
          </ol>
        </section>
      ) : null}

      <section className="card v3-card v3-panel" data-testid="pairing-panel">
        <h2>Mit Partner verknüpfen</h2>
        <p className="hint">
          Gib den Code deines Partners ein und sende die Anfrage. Sobald dein Partner sie annimmt,
          ist die Verknüpfung aktiv.
        </p>
        <div className="row v3-pairing-form">
          <input
            className="v3-partner-code-input"
            data-testid="partner-code-input"
            value={partnerCodeInput}
            onChange={(e) => {
              pairing.clearInlineError();
              setPartnerCodeInput(e.target.value);
            }}
            placeholder="Partner-Code"
          />
          <button
            className="primary"
            data-testid="send-pair-request-button"
            disabled={!partnerCodeInput.trim()}
            onClick={async () => {
              await pairing.sendPairRequest(partnerCodeInput);
              setPartnerCodeInput("");
            }}
          >
            Anfrage senden
          </button>
        </div>
        {pairing.inlineError ? (
          <div className="inline-error" data-testid="pairing-inline-error">
            {pairing.inlineError}
          </div>
        ) : null}
      </section>

      <section
        ref={requestsPanelRef}
        className="card v3-card v3-panel"
        data-testid="pairing-requests-panel"
      >
        <div className="row v3-pairing-refresh-row">
          <h2>Offene Verknüpfungsanfragen</h2>
          <div className="v3-pairing-refresh-meta">
            <span className="hint">
              Nächste Prüfung in {pairingRequestsSecondsUntilRefresh}s · zuletzt:{" "}
              {pairingRequestsLastCheckedLabel}
            </span>
            <RefreshButton
              testId="pairing-requests-refresh-button"
              onClick={refreshPairingRequestsOnly}
              disabled={isRefreshingPairingRequests}
              title="Neue Pair-Anfragen prüfen"
            />
          </div>
        </div>
        {!groupedRequests.length ? (
          <div className="empty" data-testid="pairing-requests-empty">
            Keine offenen Anfragen.
          </div>
        ) : null}
        <div className="v3-request-list">
          {groupedRequests.map((row) => (
            <div
              className="v3-request"
              data-testid="pairing-request-row"
              data-request-code={row.code}
              data-request-name={row.nickname}
              key={`${row.code}|${row.nickname}`}
            >
              <div className="v3-request-head">
                <ProfileAvatar name={row.nickname} />
                <div className="v3-request-meta">
                  <div className="v3-request-name">{row.nickname}</div>
                  <div className="mono v3-request-code">{row.code}</div>
                </div>
              </div>
              <div className="v3-request-actions">
                {row.incomingIds.length ? (
                  <>
                    <button
                      className="secondary"
                      data-testid="pairing-request-accept-button"
                      onClick={async () => {
                        const result = await pairing.respondPairing(row.incomingIds[0], "accept");
                        if (result?.pairId) workspace.openPairRoute(result.pairId);
                      }}
                    >
                      <span className="v3-action-ok">✓</span> Annehmen
                    </button>
                    <button
                      className="secondary"
                      data-testid="pairing-request-reject-button"
                      onClick={() => pairing.respondPairing(row.incomingIds[0], "reject")}
                    >
                      <span className="v3-action-bad">✕</span> Ablehnen
                    </button>
                  </>
                ) : null}
                {row.outgoingIds.length ? (
                  <button
                    className="secondary"
                    data-testid="pairing-request-cancel-button"
                    onClick={() => pairing.respondPairing(row.outgoingIds[0], "cancel")}
                  >
                    Zurückziehen
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
