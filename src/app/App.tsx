import { useEffect } from "react";
import { V3Shell } from "../features/v3/V3Shell";
import { AppGlobalChrome, AppProviders } from "./state";

export default function App() {
  return (
    <AppProviders>
      <AppGlobalChrome>
        <RemoveBootFallback />
        <V3Shell />
      </AppGlobalChrome>
    </AppProviders>
  );
}

function RemoveBootFallback() {
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.getElementById("boot-fallback")?.remove();
    }
  }, []);
  return null;
}
