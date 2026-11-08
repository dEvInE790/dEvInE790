// A soft, slightly plump heart shape used all over the site.
export const HEART_PATH =
  'M12 21.35c-.4 0-.78-.14-1.08-.4C6.1 16.83 2 13.1 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 4.6-4.1 8.33-8.92 12.45-.3.26-.68.4-1.08.4Z'

export default function Heart({ className = '', style, fill = 'currentColor' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden="true">
      <path d={HEART_PATH} fill={fill} />
    </svg>
  )
}
