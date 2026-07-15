import { useState } from "react";

export function useGroupSettingsDraft() {
  const [isLoadingGroupSettings, setIsLoadingGroupSettings] = useState(false);

  return { isLoadingGroupSettings, setIsLoadingGroupSettings };
}
