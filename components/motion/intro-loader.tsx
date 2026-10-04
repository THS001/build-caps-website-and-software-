import Image from "next/image"

/**
 * Runs before first paint: the branded intro shows once per browser session.
 * Storage errors (private mode) count as "seen", so the intro never repeats on every page.
 */
export const introScript = `try{if(sessionStorage.getItem("bc-intro"))document.documentElement.classList.add("intro-seen");else sessionStorage.setItem("bc-intro","1")}catch(e){document.documentElement.classList.add("intro-seen")}`

/**
 * First-visit intro: the logo wipes in over a rose-gold hairline, then the
 * curtain lifts. Pure CSS (see globals.css), so it never waits on JavaScript,
 * never blocks clicks, and is skipped entirely for reduced motion.
 */
export function IntroLoader() {
  return (
    <div aria-hidden className="intro-loader">
      <div className="intro-loader__mark">
        <Image src="/brand/logo-color.png" alt="" width={254} height={48} priority className="h-10 w-auto md:h-12" />
      </div>
      <div className="intro-loader__line" />
    </div>
  )
}
