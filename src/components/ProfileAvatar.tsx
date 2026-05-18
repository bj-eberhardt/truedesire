type ProfileAvatarProps = {
  name: string
}

export function ProfileAvatar({ name }: ProfileAvatarProps) {
  return (
    <div className="avatar" aria-hidden="true" title={name}>
      <svg viewBox="0 0 48 48" className="avatar-svg" role="presentation">
        <circle cx="24" cy="24" r="22" className="avatar-bg" />
        <circle cx="24" cy="19" r="8" className="avatar-fg" />
        <path
          d="M10 40c2.8-7 9-11 14-11s11.2 4 14 11"
          className="avatar-fg"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

