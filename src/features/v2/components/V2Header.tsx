type V2HeaderProps = {
  onExportBackup: () => void | Promise<void>
  onImportBackup: () => void | Promise<void>
}

export function V2Header(props: V2HeaderProps) {
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
        <button className="secondary" onClick={props.onExportBackup}>
          Backup kopieren
        </button>
        <button className="secondary" onClick={props.onImportBackup}>
          Backup importieren
        </button>
      </div>
    </header>
  )
}

