import { V3Shell } from "../features/v3/V3Shell";
import { AppGlobalChrome, AppProviders } from "./state";

export default function App() {
  return (
    <AppProviders>
      <AppGlobalChrome>
        <V3Shell />
      </AppGlobalChrome>
    </AppProviders>
  );
}
