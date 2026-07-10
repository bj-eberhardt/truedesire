import { useEffect, useMemo, useRef, useState } from "react";
import { goV3 } from "../../../app/routes";
import { ProfileAvatar } from "../../../components/ProfileAvatar";
import { useAutoHideHeader } from "../hooks/useAutoHideHeader";
import { HeartChecklistLogo } from "./HeartChecklistLogo";
import { ProfileMenu } from "./ProfileMenu";

type V3HeaderProps = {
  identity: { userId: string; nickname: string; code?: string | null } | null;
  onCopyPairingCode: () => Promise<void> | void;
  onOpenBackup: () => void;
  onDeleteAccount: () => Promise<void> | void;
};

export function V3Header(props: V3HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  const hasAccount = !!props.identity?.userId;

  const pairingCode = props.identity?.code ? String(props.identity.code) : null;
  const profileName = props.identity?.nickname ? String(props.identity.nickname) : "Profil";

  const hidden = useAutoHideHeader({ enabled: true, menuOpen });

  const profileLabel = useMemo(() => {
    if (!props.identity?.userId) return "Profil-Menü";
    return `Profil-Menü von ${props.identity.nickname}`;
  }, [props.identity?.nickname, props.identity?.userId]);

  useEffect(() => {
    if (!hasAccount && menuOpen) setMenuOpen(false);
  }, [hasAccount, menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    const onPointerDown = (e: PointerEvent) => {
      const el = profileRef.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      setMenuOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen]);

  return (
    <header className="v3-header" data-hidden={hidden ? "true" : "false"} data-testid="app-header">
      <button
        type="button"
        className="v3-brand"
        data-testid="header-brand"
        aria-label="TrueDesire"
        onClick={() => goV3()}
      >
        <HeartChecklistLogo />
        <span className="v3-brand-text">
          <span className="v3-brand-title">TrueDesire</span>
          <span className="v3-brand-subtitle">Wahre Wünsche</span>
        </span>
      </button>

      {hasAccount ? (
        <div className="v3-profile" ref={profileRef}>
          <button
            type="button"
            className="v3-profile-btn"
            data-testid="profile-menu-button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={profileLabel}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <div className="v3-avatar">
              <ProfileAvatar name={profileName} />
            </div>
            <div className="v3-code">
              <div className="v3-code-label">{profileName}</div>
              <div className="v3-code-value mono" data-testid="profile-pairing-code">
                {pairingCode ?? "-"}
              </div>
            </div>
            <div className="v3-burger" aria-hidden="true">
              <span className="v3-burger-line" />
              <span className="v3-burger-line" />
              <span className="v3-burger-line" />
            </div>
          </button>

          <ProfileMenu
            open={menuOpen}
            pairingCode={pairingCode}
            onCopyPairingCode={props.onCopyPairingCode}
            onOpenBackup={props.onOpenBackup}
            onDeleteAccount={props.onDeleteAccount}
            onClose={() => setMenuOpen(false)}
          />
        </div>
      ) : null}
    </header>
  );
}
