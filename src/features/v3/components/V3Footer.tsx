import { APP_VERSION } from "../../../app/version";

export function V3Footer() {
  return (
    <footer className="v3-footer">
      <div className="mono">TrueDesire v{APP_VERSION}</div>
    </footer>
  );
}
