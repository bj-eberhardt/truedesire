import { useEffect, useRef, useState, type ReactNode } from "react";

type V3RouteTransitionProps = {
  children: ReactNode;
  routeKey: string;
};

const V3_ROUTE_EXIT_MS = 220;

export function V3RouteTransition(props: V3RouteTransitionProps) {
  const [currentRouteKey, setCurrentRouteKey] = useState(props.routeKey);
  const [currentContent, setCurrentContent] = useState(props.children);
  const [exitingContent, setExitingContent] = useState<ReactNode | null>(null);
  const lastContentRef = useRef({ routeKey: props.routeKey, content: props.children });
  const exitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (props.routeKey === currentRouteKey) {
      setCurrentContent(props.children);
      lastContentRef.current = { routeKey: props.routeKey, content: props.children };
    }
  }, [currentRouteKey, props.children, props.routeKey]);

  useEffect(() => {
    if (props.routeKey === currentRouteKey) return;
    if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);

    setExitingContent(lastContentRef.current.content);
    setCurrentRouteKey(props.routeKey);
    setCurrentContent(props.children);
    lastContentRef.current = { routeKey: props.routeKey, content: props.children };

    exitTimerRef.current = window.setTimeout(() => {
      setExitingContent(null);
      exitTimerRef.current = null;
    }, V3_ROUTE_EXIT_MS);
  }, [currentRouteKey, props.children, props.routeKey]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="v3-route-transition">
      {exitingContent ? (
        <div className="v3-route-transition-page" data-animation-state="leaving" aria-hidden="true">
          {exitingContent}
        </div>
      ) : null}
      <div
        key={currentRouteKey}
        className="v3-route-transition-page"
        data-animation-state="entering"
      >
        {currentContent}
      </div>
    </div>
  );
}
