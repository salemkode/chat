export function AdminBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-white dark:bg-[#09090b]" />
      <div className="absolute -left-20 top-16 h-72 w-72 rounded-full bg-[#efe3ff] dark:bg-[#21162d]" />
      <div className="absolute right-[-5rem] top-[-2rem] h-96 w-96 rounded-[4rem] bg-[#dff1ff] dark:bg-[#102232]" />
      <div className="absolute bottom-10 left-1/3 h-72 w-72 rounded-full bg-[#ffedcf] dark:bg-[#302311]" />
      <div className="absolute left-[9%] top-[16%] hidden h-44 w-44 rotate-12 rounded-[2rem] border border-zinc-200 bg-[#f7f4ee] shadow-[0_24px_80px_rgba(15,23,42,0.08)] lg:block dark:border-zinc-800 dark:bg-[#141417] dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)]" />
      <div className="absolute right-[11%] top-[30%] hidden h-56 w-56 rounded-full border border-zinc-200 bg-[#faf7f2] xl:block dark:border-zinc-800 dark:bg-[#111216]" />
      <div className="absolute inset-0 [background-image:linear-gradient(to_right,rgba(0,0,0,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.14)_1px,transparent_1px)] [background-size:72px_72px] dark:[background-image:linear-gradient(to_right,rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.12)_1px,transparent_1px)]" />
    </div>
  )
}
