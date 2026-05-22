export function AdminBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(148,163,184,0.08),transparent_22%),radial-gradient(circle_at_top_left,rgba(245,158,11,0.08),transparent_24%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.07),transparent_22%)] dark:bg-[linear-gradient(180deg,rgba(148,163,184,0.05),transparent_22%),radial-gradient(circle_at_top_left,rgba(180,83,9,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(30,64,175,0.12),transparent_22%)]" />
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(to_right,rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.06)_1px,transparent_1px)] [background-size:112px_112px] dark:[background-image:linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)]" />
    </div>
  )
}
