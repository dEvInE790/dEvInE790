import SiteHeader from './SiteHeader'
import SiteFooter from './SiteFooter'
import SetupBanner from './SetupBanner'

export default function PublicLayout({ children, transparentHeader = false, footer = true }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader transparent={transparentHeader} />
      <SetupBanner />
      <main className="flex-1">{children}</main>
      {footer && <SiteFooter />}
    </div>
  )
}
