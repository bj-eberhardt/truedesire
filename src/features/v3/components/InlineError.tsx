import type { ReactNode } from 'react'

export function InlineError(props: { children: ReactNode }) {
  return <div className="inline-error">{props.children}</div>
}

