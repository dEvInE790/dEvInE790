import { useEffect, useState } from 'react'

/** Current time, refreshed every `interval` ms (keeps components pure for the React Compiler). */
export default function useNow(interval = 30000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(t)
  }, [interval])
  return now
}
