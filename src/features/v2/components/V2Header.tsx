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
          <div className="title">love.interests</div>
          <div className="subtitle">Version 2</div>
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

