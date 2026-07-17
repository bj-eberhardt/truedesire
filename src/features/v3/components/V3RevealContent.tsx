import { useEffect, useRef, useState, type ReactNode } from "react";

type V3RevealContentProps = {
  children: ReactNode;
  isLoading: boolean;
  loading: ReactNode;
  className?: string;
};

const V3_REVEAL_EXIT_MS = 180;

export function V3RevealContent(props: V3RevealContentProps) {
  const [closingContent, setClosingContent] = useState<ReactNode | null>(null);
  const previousContentRef = useRef<ReactNode | null>(props.isLoading ? null : props.children);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!props.isLoading) {
      previousContentRef.current = props.children;
    }
  });

  useEffect(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (!props.isLoading) {
      setClosingContent(null);
      return undefined;
    }

    if (!previousContentRef.current) return undefined;

    setClosingContent(previousContentRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setClosingContent(null);
      closeTimerRef.current = null;
    }, V3_REVEAL_EXIT_MS);

    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [props.isLoading]);

  const className = `v3-reveal-content${props.className ? ` ${props.className}` : ""}`;

  return (
    <>
      {props.isLoading ? props.loading : null}
      {props.isLoading ? null : (
        <div className={className} data-animation-state="open">
          <div className="v3-reveal-content-inner">{props.children}</div>
        </div>
      )}
      {closingContent ? (
        <div className={className} data-animation-state="closing" aria-hidden="true">
          <div className="v3-reveal-content-inner">{closingContent}</div>
        </div>
      ) : null}
    </>
  );
}
