type AppHeaderProps = {
  uiVersion: 1 | 2
  onSwitchVersion: (v: 1 | 2) => void | Promise<void>
  onExportBackup: () => void | Promise<void>
  onImportBackup: () => void | Promise<void>
}

export function AppHeader({ uiVersion, onSwitchVersion, onExportBackup, onImportBackup }: AppHeaderProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="logo">LI</div>
        <div>
          <div className="title">TrueDesire</div>
          <div className="subtitle">Wahre Wünsche</div>
        </div>
      </div>
      <div className="top-actions">
        <div className="version-toggle" role="group" aria-label="UI version">
          <button type="button" className={uiVersion === 1 ? 'active' : ''} onClick={() => onSwitchVersion(1)}>
            Version 1
          </button>
          <button type="button" className={uiVersion === 2 ? 'active' : ''} onClick={() => onSwitchVersion(2)}>
            Version 2
          </button>
        </div>
        <button className="secondary" onClick={onExportBackup}>
          Backup kopieren
        </button>
        <button className="secondary" onClick={onImportBackup}>
          Backup importieren
        </button>
      </div>
    </header>
  )
}

