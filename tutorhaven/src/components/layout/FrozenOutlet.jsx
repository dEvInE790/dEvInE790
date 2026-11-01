import { useState } from 'react'
import { useOutlet } from 'react-router-dom'

/**
 * <Outlet /> always renders the *current* route, so inside AnimatePresence the
 * exiting page would briefly show (and mount) the next page. Freezing the outlet
 * keeps each animated page bound to the route it was created for.
 */
export default function FrozenOutlet() {
  const outlet = useOutlet()
  const [frozen] = useState(outlet)
  return frozen
}
