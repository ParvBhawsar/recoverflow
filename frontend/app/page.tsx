import Image from "next/image";
import Link from "next/link";
import { Brand } from "@/components/app-shell";

const API_DOCS = "https://recoverflow-api-ul43.onrender.com/docs";

// Illustrative photography is sourced from Pexels under the Pexels license.
// The people pictured are not presented as RecoverFlow customers or endorsers.
const STORY_IMAGES = {
  operator:
    "https://images.pexels.com/photos/20552542/pexels-photo-20552542/free-photo-of-elegant-woman-working-on-laptop.jpeg?auto=compress&cs=tinysrgb&w=1400",
  fulfillment:
    "https://images.pexels.com/photos/7857532/pexels-photo-7857532.jpeg?auto=compress&cs=tinysrgb&w=1200",
  team:
    "https://images.pexels.com/photos/4307856/pexels-photo-4307856.jpeg?auto=compress&cs=tinysrgb&w=1200",
};

function Arrow({ className = "h-4 w-4" }: { className?: string }) {
  return <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h12"/><path d="m11.5 5.5 4.5 4.5-4.5 4.5"/></svg>;
}

function Check() {
  return <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600"><svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 10 3 3 7-7"/></svg></span>;
}

function Spark() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 1.5 4.3L18 9l-4.5 1.7L12 15l-1.5-4.3L6 9l4.5-1.7L12 3Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/></svg>;
}

function ProductPreview() {
  const cases = [
    ["pay_8F2A91", "Incorrect OTP", "₹4,999", "Create link", "blue"],
    ["pay_17BC44", "Gateway timeout", "₹7,999", "Verify", "amber"],
    ["pay_A98D11", "Original paid late", "₹5,402", "Stopped", "green"],
  ];

  return (
    <div className="rf-preview-stage relative mx-auto w-full max-w-[980px] animate-float-soft">
      <div className="absolute -inset-10 -z-10 rounded-[48px] bg-[radial-gradient(circle_at_center,rgba(47,91,255,.18),rgba(96,74,255,.06)_40%,transparent_72%)] blur-2xl" />

      <div className="overflow-hidden rounded-[20px] border border-[#dbe3f0] bg-white shadow-[0_38px_110px_rgba(24,41,84,.18)] sm:rounded-[24px]">
        <div className="flex items-center gap-2 border-b border-[#edf0f5] bg-[#fbfcfe] px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex gap-1.5"><span className="h-2 w-2 rounded-full bg-[#d9dee8]"/><span className="h-2 w-2 rounded-full bg-[#d9dee8]"/><span className="h-2 w-2 rounded-full bg-[#d9dee8]"/></div>
          <span className="ml-2 text-[7px] font-semibold text-[#9ba3b3] sm:text-[9px]">RecoverFlow Console</span>
          <span className="ml-auto flex items-center gap-1.5 rounded-full border border-[#dfe6f3] bg-white px-2 py-1 text-[6px] font-extrabold uppercase tracking-[.08em] text-[#63708a] sm:text-[7px]"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>Razorpay Test Mode</span>
        </div>

        <div className="grid bg-[#f7f9fc] sm:grid-cols-[170px_1fr] md:grid-cols-[190px_1fr]">
          <aside className="hidden border-r border-[#e8ebf2] bg-white p-3.5 sm:block">
            <div className="mb-5 flex items-center gap-2 px-1"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#2f5bff] text-[9px] font-black text-white">RF</span><span className="text-[10px] font-extrabold text-[#15203c]">RecoverFlow</span></div>
            {["Overview", "Recovery cases", "Insights", "Safeguards"].map((label, index) => <div key={label} className={`mb-1 rounded-lg px-3 py-2 text-[8px] font-semibold md:text-[9px] ${index === 0 ? "bg-[#eef3ff] text-[#2f5bff]" : "text-[#7d8799]"}`}>{label}</div>)}
            <div className="mt-6 px-3 text-[7px] font-extrabold uppercase tracking-[.16em] text-[#a9afbb]">Testing</div>
            <div className="mt-2 rounded-lg px-3 py-2 text-[8px] font-semibold text-[#7d8799] md:text-[9px]">Test sandbox</div>
          </aside>

          <div className="min-w-0 p-3 sm:p-4 md:p-5">
            <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
              <div><p className="text-[10px] font-extrabold text-[#15203c] sm:text-[11px]">Recovery overview</p><p className="mt-0.5 text-[7px] text-[#9098aa] sm:text-[8px]">Context before collection</p></div>
              <span className="rounded-lg bg-[#17213f] px-2.5 py-2 text-[7px] font-bold text-white sm:px-3 sm:text-[8px]">Live decision layer</span>
            </div>

            <div className="mb-3 grid grid-cols-4 gap-1.5 rounded-[10px] border border-[#e6eaf2] bg-white p-2 sm:p-2.5">
              {[["01", "Detect"], ["02", "Diagnose"], ["03", "Guard"], ["04", "Act"]].map(([num, label], index) => <div key={label} className="relative text-center"><div className={`mx-auto grid h-6 w-6 place-items-center rounded-full text-[6px] font-black ${index === 3 ? "bg-emerald-50 text-emerald-700" : "bg-[#eef3ff] text-[#2f5bff]"}`}>{num}</div><p className="mt-1 text-[6px] font-extrabold uppercase tracking-[.08em] text-[#7f899d]">{label}</p>{index < 3 && <span className="absolute left-[62%] top-3 hidden h-px w-[76%] bg-[#e3e8f2] sm:block"/>}</div>)}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
              {[["At risk", "₹18,400"], ["Recovered", "₹12,900"], ["Recovery rate", "70.1%"], ["Protected", "₹4,999"]].map(([label, value]) => <div key={label} className="rounded-[10px] border border-[#e6eaf2] bg-white p-2.5 sm:rounded-xl sm:p-3"><p className="text-[6px] font-bold uppercase tracking-[.09em] text-[#9aa1af] sm:text-[7px]">{label}</p><p className="mt-1.5 text-[13px] font-extrabold tracking-tight text-[#17213e] sm:mt-2 sm:text-[15px]">{value}</p></div>)}
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[1.32fr_.68fr]">
              <div className="overflow-hidden rounded-xl border border-[#e6eaf2] bg-white">
                <div className="flex items-center justify-between border-b border-[#edf0f5] px-3 py-2.5"><span className="text-[8px] font-extrabold text-[#17213e] sm:text-[9px]">Recovery cases</span><span className="text-[7px] font-bold text-[#2f5bff]">Contextual decisions</span></div>
                {cases.map((row, index) => <div key={row[0]} className={`grid grid-cols-[1fr_auto] items-center gap-2 px-3 py-2.5 sm:grid-cols-[1fr_.65fr_.65fr] sm:py-3 ${index < cases.length - 1 ? "border-b border-[#f0f2f6]" : ""}`}><div className="min-w-0"><p className="truncate font-mono text-[6px] font-bold text-[#3c4761] sm:text-[7px]">{row[0]}</p><p className="mt-1 truncate text-[7px] text-[#9aa2b2]">{row[1]}</p></div><span className="hidden text-[8px] font-extrabold text-[#26314c] sm:inline">{row[2]}</span><span className={`rounded-full px-2 py-1 text-center text-[6px] font-extrabold ${row[4] === "green" ? "bg-emerald-50 text-emerald-700" : row[4] === "amber" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-[#2f5bff]"}`}>{row[3]}</span></div>)}
              </div>

              <div className="hidden rounded-xl border border-[#dce5f5] bg-[linear-gradient(160deg,#15203c,#111a35)] p-3.5 text-white lg:block">
                <div className="flex items-center gap-2 text-[#90a9ff]"><Spark/><p className="text-[7px] font-extrabold uppercase tracking-[.12em]">Decision trace</p></div>
                <p className="mt-3 text-[12px] font-extrabold leading-4">Recover this payment — but only once.</p>
                <p className="mt-2 text-[8px] leading-4 text-[#b6c0d8]">Customer-fixable failure. Amount and model confidence remain within merchant-defined autonomy.</p>
                <div className="mt-4 rounded-lg border border-white/8 bg-white/5 p-2.5"><div className="flex items-center justify-between"><p className="text-[7px] font-bold text-[#aab7d3]">CONFIDENCE</p><span className="text-[8px] font-extrabold">92%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[92%] rounded-full bg-[#718fff]"/></div></div>
                <div className="mt-3 flex items-center gap-1.5 text-[7px] font-bold text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>Policy approved</div>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-[#edf0f5] bg-white px-4 py-2 text-center text-[7px] font-semibold text-[#a0a7b4]">Illustrative Test Mode data · every action remains policy guarded and auditable</div>
      </div>
    </div>
  );
}

function WorkflowCard({ num, title, body }: { num: string; title: string; body: string }) {
  return <div className="group relative overflow-hidden rounded-[18px] border border-[#e1e7f1] bg-white p-5 shadow-[0_5px_18px_rgba(22,34,70,.03)] transition duration-300 hover:-translate-y-1 hover:border-[#cfd9ef] hover:shadow-[0_18px_42px_rgba(22,34,70,.08)] sm:p-6"><span className="absolute -right-3 -top-5 text-[64px] font-black tracking-[-.08em] text-[#f3f6ff] transition duration-300 group-hover:text-[#edf2ff]">{num}</span><div className="relative"><span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#eef3ff] text-[8px] font-extrabold text-[#2f5bff]">{num}</span><h3 className="mt-5 text-[16px] font-[760] tracking-[-0.03em] text-[#16213f]">{title}</h3><p className="mt-3 text-[11px] leading-5 text-[#788196]">{body}</p></div></div>;
}

function OutcomeCard({ tone, label, title, body }: { tone: "blue" | "amber" | "rose"; label: string; title: string; body: string }) {
  const toneClass = tone === "blue" ? "bg-[#eef3ff] text-[#2f5bff]" : tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700";
  return <div className="rounded-[18px] border border-[#e3e8f1] bg-white p-5 shadow-[0_5px_18px_rgba(22,34,70,.025)]"><div className={`inline-flex rounded-full px-2.5 py-1 text-[7px] font-extrabold uppercase tracking-[.11em] ${toneClass}`}>{label}</div><h3 className="mt-4 text-[16px] font-[760] tracking-[-.03em] text-[#17213f]">{title}</h3><p className="mt-2.5 text-[10px] leading-5 text-[#7b8599]">{body}</p></div>;
}

function StoryPhoto({ src, alt, label, className, imageClassName = "", sizes }: { src: string; alt: string; label: string; className: string; imageClassName?: string; sizes: string }) {
  return (
    <figure className={`group relative isolate overflow-hidden rounded-[18px] bg-[#e9edf5] shadow-[0_16px_44px_rgba(19,31,62,.10)] ${className}`}>
      <Image src={src} alt={alt} fill sizes={sizes} className={`object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035] ${imageClassName}`} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0d1730]/75 via-[#0d1730]/20 to-transparent" />
      <figcaption className="absolute bottom-3 left-3 rounded-full border border-white/15 bg-[#111a35]/68 px-2.5 py-1.5 text-[7px] font-extrabold uppercase tracking-[.11em] text-white shadow-sm backdrop-blur-md sm:bottom-4 sm:left-4 sm:text-[8px]">{label}</figcaption>
    </figure>
  );
}

function MerchantStories() {
  return (
    <section className="relative overflow-hidden border-y border-[#edf0f5] bg-white">
      <div className="absolute inset-y-0 right-0 hidden w-[42%] bg-[radial-gradient(circle_at_center,rgba(47,91,255,.07),transparent_68%)] lg:block" />
      <div className="relative mx-auto grid max-w-[1120px] gap-10 px-5 py-20 md:px-7 md:py-24 lg:grid-cols-[.72fr_1.28fr] lg:items-center lg:gap-14">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#2f5bff]">Built around real commerce</p>
          <h2 className="mt-3 text-[34px] font-[770] leading-[1.08] tracking-[-0.045em] text-[#121d39] md:text-[44px]">Payments are technical. Revenue recovery is operational.</h2>
          <p className="mt-5 max-w-[470px] text-[13px] leading-6 text-[#707a91]">Behind every failed transaction is a customer, an order, and a team deciding what to do next. RecoverFlow is built for that operating reality — recover what is recoverable, wait when the payment state is uncertain, and stop when another collection attempt would be unsafe.</p>
          <div className="mt-6 flex flex-wrap gap-2">{["Online commerce", "Payment operations", "Customer experience"].map((item) => <span key={item} className="rounded-full border border-[#e1e6ef] bg-[#fafbfe] px-3 py-1.5 text-[8px] font-bold text-[#69758d]">{item}</span>)}</div>
          <Link href="/cases" className="mt-7 inline-flex items-center gap-2 text-[10px] font-extrabold text-[#2f5bff] hover:underline">See the recovery workspace <Arrow className="h-3.5 w-3.5"/></Link>
        </div>

        <div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-12 sm:grid-rows-2 sm:gap-3">
            <StoryPhoto src={STORY_IMAGES.operator} alt="Illustrative business professional working on a laptop in an office" label="Merchant operations" className="col-span-2 aspect-[16/10] sm:col-span-7 sm:row-span-2 sm:aspect-auto sm:min-h-[470px]" imageClassName="object-[center_28%]" sizes="(max-width: 639px) 100vw, 58vw" />
            <StoryPhoto src={STORY_IMAGES.fulfillment} alt="Illustrative small-business order fulfillment with a laptop and parcels" label="Order fulfillment" className="col-span-1 aspect-[4/3] sm:col-span-5" imageClassName="object-center" sizes="(max-width: 639px) 50vw, 36vw" />
            <StoryPhoto src={STORY_IMAGES.team} alt="Illustrative professional working on a laptop" label="Digital-first teams" className="col-span-1 aspect-[4/3] sm:col-span-5" imageClassName="object-[center_38%]" sizes="(max-width: 639px) 50vw, 36vw" />
          </div>
          <p className="mt-2.5 text-right text-[7px] font-medium text-[#a0a7b4]">Illustrative business photography</p>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-[#111a35]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#e8ebf2]/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[64px] max-w-[1220px] items-center gap-5 px-4 sm:h-[68px] sm:px-5 md:px-7">
          <Brand />
          <nav className="hidden flex-1 items-center justify-center gap-7 md:flex">
            <a href="#platform" className="text-[11px] font-semibold text-[#687288] transition hover:text-[#1a2746]">Platform</a>
            <a href="#safety" className="text-[11px] font-semibold text-[#687288] transition hover:text-[#1a2746]">Safeguards</a>
            <a href="#insights" className="text-[11px] font-semibold text-[#687288] transition hover:text-[#1a2746]">Insights</a>
          </nav>
          <Link href="/dashboard" className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-[10px] bg-[#17213f] px-3 py-2.5 text-[9px] font-bold text-white shadow-[0_7px_18px_rgba(23,33,63,.16)] transition hover:-translate-y-0.5 hover:bg-[#0e1833] sm:gap-2 sm:px-4 sm:text-[11px]">Open console <Arrow className="h-3.5 w-3.5 sm:h-4 sm:w-4"/></Link>
        </div>
      </header>

      <section className="hero-glow relative overflow-hidden pt-[64px] sm:pt-[68px]">
        <div className="surface-grid absolute inset-0 opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
        <div className="soft-orb left-[5%] top-[12%]"/><div className="soft-orb soft-orb-secondary right-[4%] top-[24%]"/>
        <div className="relative mx-auto max-w-[1220px] px-4 pb-20 pt-14 text-center sm:px-5 sm:pb-24 sm:pt-20 md:px-7 md:pb-28 md:pt-24">
          <h1 className="mx-auto max-w-[1040px] text-[clamp(2.75rem,10vw,5.35rem)] font-[800] leading-[.94] tracking-[-0.067em] text-[#0f1933]">Recover failed payments.<br/><span className="text-[#2f5bff]">Know when not to retry.</span></h1>
          <p className="mx-auto mt-6 max-w-[740px] text-[13px] leading-6 text-[#68738c] sm:text-[15px] sm:leading-7 md:text-[17px]">RecoverFlow turns payment failure into a decision: <strong className="font-[760] text-[#293652]">recover, verify, or escalate</strong> — then lets merchant policy decide whether money can move.</p>

          <div className="mt-8 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center sm:gap-3">
            <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 rounded-[11px] bg-[#2f5bff] px-5 py-3.5 text-[11px] font-bold text-white shadow-[0_14px_32px_rgba(47,91,255,.28)] transition hover:-translate-y-0.5 hover:bg-[#244fe0] sm:text-[12px]">Open recovery console <Arrow /></Link>
            <a href="#platform" className="inline-flex items-center justify-center gap-2 rounded-[11px] border border-[#d9e1ee] bg-white px-5 py-3.5 text-[11px] font-bold text-[#32405e] shadow-sm transition hover:-translate-y-0.5 hover:border-[#c9d4e7] hover:bg-[#fafbfe] sm:text-[12px]">See how decisions work <Arrow className="h-3.5 w-3.5"/></a>
          </div>

          <div className="mx-auto mt-12 max-w-[1040px] sm:mt-16"><ProductPreview /></div>
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-[#1d2948] bg-[#111a35] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(87,111,255,.20),transparent_44%)]"/>
        <div className="relative mx-auto max-w-[1120px] px-5 py-10 md:px-7 md:py-12">
          <p className="text-center text-[9px] font-extrabold uppercase tracking-[.2em] text-[#8fa7ff]">One failure. Three possible outcomes.</p>
          <div className="mt-7 grid gap-5 sm:grid-cols-3">
            {[["01", "RECOVER", "Customer can fix it", "Open one bounded collection path — only when policy allows."], ["02", "VERIFY", "Payment state is uncertain", "Wait for the original transaction before risking another collection."], ["03", "ESCALATE", "Risk is too high", "Hand control to a human when value, confidence, or attempts cross policy."]].map(([num, action, title, body]) => <div key={action} className="group border-t border-white/12 pt-4"><div className="flex items-center justify-between"><span className="text-[8px] font-extrabold text-[#7f98ff]">{num}</span><span className="text-[8px] font-black tracking-[.14em] text-white/45 transition group-hover:text-white/70">{action}</span></div><p className="mt-3 text-[15px] font-[760] tracking-[-.025em] text-white">{title}</p><p className="mt-2 text-[9px] leading-4 text-[#aeb9d3]">{body}</p></div>)}
          </div>
        </div>
      </section>

      <section id="platform" className="bg-[#fbfcfe]">
        <div className="mx-auto max-w-[1120px] px-5 py-20 md:px-7 md:py-24">
          <div className="mx-auto max-w-[780px] text-center"><p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#2f5bff]">Recovery orchestration</p><h2 className="mt-3 text-[34px] font-[780] leading-[1.06] tracking-[-0.05em] text-[#121d39] md:text-[46px]">AI proposes the next move.<br/>Policy earns the right to execute it.</h2><p className="mx-auto mt-5 max-w-[650px] text-[13px] leading-6 text-[#707a91]">That separation is the product. RecoverFlow can reason about payment context without giving a model unrestricted control over money movement.</p></div>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <WorkflowCard num="01" title="Understand" body="Normalize Razorpay failure context — source, step, reason, amount and payment method."/>
            <WorkflowCard num="02" title="Decide" body="Choose recover, wait-and-verify, or escalate with structured confidence and rationale."/>
            <WorkflowCard num="03" title="Guard" body="Apply amount ceilings, confidence thresholds, attempt caps and terminal-state checks."/>
            <WorkflowCard num="04" title="Reconcile" body="Execute approved Payment Links and let signed webhooks settle the final state."/>
          </div>

          <div className="mt-12 grid gap-3 lg:grid-cols-3">
            <OutcomeCard tone="blue" label="Recover" title="Act when the customer can fix it." body="Authentication failures and other customer-fixable cases can receive one bounded recovery path when policy approves."/>
            <OutcomeCard tone="amber" label="Wait & verify" title="Do nothing when uncertainty is the risk." body="Ambiguous gateway or bank states stay in verification so a late original success is not turned into a duplicate collection."/>
            <OutcomeCard tone="rose" label="Escalate" title="Stop autonomy when risk exceeds policy." body="High-value, low-confidence, or exhausted-attempt cases leave the autonomous path and require human review."/>
          </div>
          <div className="mt-7 text-center"><Link href="/cases" className="inline-flex items-center gap-2 text-[10px] font-extrabold text-[#2f5bff] hover:underline">Explore live recovery cases <Arrow className="h-3.5 w-3.5"/></Link></div>
        </div>
      </section>

      <MerchantStories />

      <section id="safety" className="border-y border-[#edf0f5] bg-white">
        <div className="mx-auto max-w-[1120px] px-5 py-20 md:px-7 md:py-24">
          <div className="grid gap-10 lg:grid-cols-[1.02fr_.98fr] lg:items-center">
            <div className="relative overflow-hidden rounded-[24px] bg-[#111a35] p-7 text-white shadow-[0_28px_80px_rgba(16,26,53,.20)] md:p-9"><div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#4d67ff]/15 blur-3xl"/><div className="relative"><p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#8fa8ff]">Safety architecture</p><h3 className="mt-4 text-[32px] font-[770] leading-[1.02] tracking-[-0.045em]">A recovery agent<br/>that is designed<br/><span className="text-[#89a4ff]">to say no.</span></h3><div className="mt-8 space-y-3">{["Merchant-defined autonomous amount ceiling", "Minimum model-confidence threshold", "Maximum recovery-attempt limit", "Mandatory wait-and-verify and escalation exits", "Late-success cancellation before duplicate collection"].map((text) => <div key={text} className="flex items-center gap-3 border-b border-white/8 pb-3 last:border-0"><Check/><span className="text-[11px] font-medium text-[#d5dcf0]">{text}</span></div>)}</div></div></div>
            <div><p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#2f5bff]">The differentiator</p><h2 className="mt-3 text-[34px] font-[780] leading-[1.06] tracking-[-0.05em] text-[#121d39] md:text-[46px]">The safest retry is sometimes no retry at all.</h2><p className="mt-5 text-[13px] leading-6 text-[#707a91]">Gateway timeouts and ambiguous states can resolve late. RecoverFlow holds those cases instead of reflexively charging again. If the original payment later succeeds, any open recovery path is stopped and the protection is recorded.</p><div className="mt-7 rounded-[15px] border border-emerald-100 bg-emerald-50/55 p-4"><p className="text-[8px] font-extrabold uppercase tracking-[.12em] text-emerald-700">Late-success protection</p><p className="mt-2 text-[11px] font-[720] leading-5 text-[#35574b]">Original payment succeeds → open recovery link is cancelled → duplicate collection is prevented.</p></div><Link href="/settings/policy" className="mt-6 inline-flex items-center gap-2 text-[10px] font-extrabold text-[#2f5bff] hover:underline">View merchant safeguards <Arrow className="h-3.5 w-3.5"/></Link></div>
          </div>
        </div>
      </section>

      <section id="insights" className="bg-[#f7f9ff]">
        <div className="mx-auto max-w-[1120px] px-5 py-20 md:px-7 md:py-24">
          <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr] lg:items-end"><div><p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#2f5bff]">Merchant insights</p><h2 className="mt-3 text-[34px] font-[780] tracking-[-0.05em] text-[#121d39] md:text-[44px]">Measure money recovered — and risk avoided.</h2></div><p className="max-w-[610px] text-[13px] leading-6 text-[#737d92] lg:justify-self-end">Revenue recovery is not just a retry count. RecoverFlow separates recovered value, revenue still at risk, failure mix, case states and late-success protection into operating signals.</p></div>
          <div className="mt-10 grid gap-3 md:grid-cols-12">
            <div className="rounded-[19px] border border-[#dfe6f2] bg-white p-6 shadow-[0_8px_24px_rgba(24,39,79,.035)] md:col-span-5"><span className="text-[8px] font-extrabold uppercase tracking-[.13em] text-[#2f5bff]">Recovery performance</span><p className="mt-4 text-[25px] font-[780] tracking-[-.045em] text-[#17213e]">What came back?</p><p className="mt-3 text-[10px] leading-5 text-[#7d8699]">Recovered revenue, active revenue at risk and confirmed recovery rate stay visible in one merchant view.</p></div>
            <div className="rounded-[19px] border border-[#dfe6f2] bg-[#111a35] p-6 text-white shadow-[0_18px_48px_rgba(17,26,53,.14)] md:col-span-4"><span className="text-[8px] font-extrabold uppercase tracking-[.13em] text-[#8fa8ff]">Safety signal</span><p className="mt-4 text-[25px] font-[780] tracking-[-.045em]">What did we avoid?</p><p className="mt-3 text-[10px] leading-5 text-[#b7c1d8]">Late-success protection exposes duplicate-risk cases where the correct action was to stop collection.</p></div>
            <div className="rounded-[19px] border border-[#dfe6f2] bg-white p-6 shadow-[0_8px_24px_rgba(24,39,79,.035)] md:col-span-3"><span className="text-[8px] font-extrabold uppercase tracking-[.13em] text-[#2f5bff]">Failure intelligence</span><p className="mt-4 text-[22px] font-[780] tracking-[-.045em] text-[#17213e]">Why did it fail?</p><p className="mt-3 text-[10px] leading-5 text-[#7d8699]">See which failure reasons dominate the recovery workload.</p></div>
          </div>
          <div className="mt-8 text-center"><Link href="/analytics" className="inline-flex items-center gap-2 rounded-[10px] border border-[#d7e0ef] bg-white px-4 py-2.5 text-[10px] font-bold text-[#33405d] transition hover:-translate-y-0.5 hover:border-[#c6d2e7] hover:shadow-sm">Open recovery insights <Arrow className="h-3.5 w-3.5"/></Link></div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-x-0 top-0 mx-auto h-72 max-w-[900px] bg-[radial-gradient(circle_at_center,rgba(47,91,255,.09),transparent_68%)]"/>
        <div className="relative mx-auto max-w-[980px] px-5 py-20 text-center md:px-7 md:py-24">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#2f5bff]">Revenue recovery with judgment</p><h2 className="mx-auto mt-3 max-w-[800px] text-[38px] font-[790] leading-[1.02] tracking-[-.055em] text-[#121d39] md:text-[52px]">Recover what should be recovered.<br/><span className="text-[#2f5bff]">Stop what should not.</span></h2><p className="mx-auto mt-5 max-w-[630px] text-[13px] leading-6 text-[#737d92]">Inspect live recovery cases, test safeguard behavior and follow each bounded decision through Razorpay execution.</p><div className="mt-8 flex flex-col justify-center gap-2.5 sm:flex-row"><Link href="/dashboard" className="inline-flex items-center justify-center gap-2 rounded-[11px] bg-[#2f5bff] px-5 py-3.5 text-[11px] font-bold text-white shadow-[0_12px_28px_rgba(47,91,255,.22)] transition hover:-translate-y-0.5 hover:bg-[#244fe0]">Open recovery console <Arrow/></Link><Link href="/simulator" className="rounded-[11px] border border-[#dde3ee] bg-white px-5 py-3.5 text-[11px] font-bold text-[#33405d] transition hover:-translate-y-0.5 hover:bg-[#fafbfe]">Open test sandbox</Link></div>
        </div>
      </section>

      <footer className="border-t border-[#edf0f5] bg-[#fbfcfe]">
        <div className="mx-auto grid max-w-[1120px] gap-8 px-5 py-10 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:px-7">
          <div><Brand/><p className="mt-4 max-w-[260px] text-[9px] leading-5 text-[#8a93a5]">AI-assisted revenue recovery for failed Razorpay payments with merchant-controlled safeguards.</p><p className="mt-3 text-[8px] font-semibold text-[#a0a7b4]">Razorpay Test Mode integration</p></div>
          <div><p className="text-[8px] font-extrabold uppercase tracking-[.15em] text-[#9aa2b1]">Product</p><div className="mt-3 space-y-2.5 text-[9px] font-semibold text-[#667188]"><Link className="block hover:text-[#23304c]" href="/dashboard">Overview</Link><Link className="block hover:text-[#23304c]" href="/cases">Recovery cases</Link><Link className="block hover:text-[#23304c]" href="/analytics">Insights</Link></div></div>
          <div><p className="text-[8px] font-extrabold uppercase tracking-[.15em] text-[#9aa2b1]">Controls</p><div className="mt-3 space-y-2.5 text-[9px] font-semibold text-[#667188]"><Link className="block hover:text-[#23304c]" href="/settings/policy">Safeguards</Link><Link className="block hover:text-[#23304c]" href="/simulator">Test sandbox</Link><Link className="block hover:text-[#23304c]" href="/analytics/evaluation">Model validation</Link></div></div>
          <div><p className="text-[8px] font-extrabold uppercase tracking-[.15em] text-[#9aa2b1]">Technical</p><div className="mt-3 space-y-2.5 text-[9px] font-semibold text-[#667188]"><a className="block hover:text-[#23304c]" href={API_DOCS} target="_blank" rel="noreferrer">Developer docs ↗</a><a className="block hover:text-[#23304c]" href="https://github.com/ParvBhawsar/recoverflow" target="_blank" rel="noreferrer">GitHub ↗</a></div></div>
        </div>
      </footer>
    </main>
  );
}
