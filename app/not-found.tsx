// Fallback for requests the locale middleware never sees (e.g. unmatched static paths).
// Without a root layout this page must render its own <html>.
export default function RootNotFound() {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <a href="/">Buildcaps — back to home</a>
      </body>
    </html>
  )
}
