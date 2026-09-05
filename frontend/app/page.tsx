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

function ProductPreview() {
  const cases = [
    ["pay_8F2A91", "Incorrect OTP", "₹4,999", "Needs action", "blue"],
    ["pay_17BC44", "Gateway timeout", "₹7,999", "Verify", "amber"],
    ["pay_A98D11", "Recovered", "₹5,402", "Recovered", "green"],
  ];

  return (
    <div className="relative mx-auto w-full max-w-[900px] animate-float-soft">
      <div className="absolute -inset-8 -z-10 rounded-[44px] bg-[#2f5bff]/8 blur-3xl" />
      <div className="overflow-hidden rounded-[18px] border border-[#dfe5f0] bg-white shadow-[0_30px_100px_rgba(28,45,90,.17)] sm:rounded-[22px]">
        <div className="flex items-center gap-2 border-b border-[#edf0f5] bg-[#fbfcfe] px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex gap-1.5"><span className="h-2 w-2 rounded-full bg-[#d9dee8]"/><span className="h-2 w-2 rounded-full bg-[#d9dee8]"/><span className="h-2 w-2 rounded-full bg-[#d9dee8]"/></div>
          <span className="ml-2 text-[7px] font-semibold text-[#9ba3b3] sm:text-[9px]">RecoverFlow Console</span>
          <span className="ml-auto rounded-full border border-[#e1e5ed] bg-white px-2 py-1 text-[6px] font-extrabold uppercase tracking-[.08em] text-[#788398] sm:text-[7px]">Test mode</span>
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
              <div><p className="text-[10px] font-extrabold text-[#15203c] sm:text-[11px]">Recovery overview</p><p className="mt-0.5 text-[7px] text-[#9098aa] sm:text-[8px]">Live payment operations</p></div>
              <button className="rounded-lg bg-[#2f5bff] px-2.5 py-2 text-[7px] font-bold text-white sm:px-3 sm:text-[8px]">Create test case</button>
            </div>

            <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 sm:hidden">
              {['Overview','Cases','Insights','Rules'].map((item, index) => <span key={item} className={`whitespace-nowrap rounded-full px-2.5 py-1.5 text-[7px] font-bold ${index === 0 ? 'bg-[#eef3ff] text-[#2f5bff]' : 'bg-white text-[#8992a4]'}`}>{item}</span>)}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
              {[["At risk", "₹18,400"], ["Recovered", "₹12,900"], ["Recovery rate", "70.1%"], ["Protected", "₹4,999"]].map(([label, value]) => <div key={label} className="rounded-[10px] border border-[#e6eaf2] bg-white p-2.5 sm:rounded-xl sm:p-3"><p className="text-[6px] font-bold uppercase tracking-[.09em] text-[#9aa1af] sm:text-[7px]">{label}</p><p className="mt-1.5 text-[13px] font-extrabold tracking-tight text-[#17213e] sm:mt-2 sm:text-[15px]">{value}</p></div>)}
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[1.35fr_.65fr]">
              <div className="overflow-hidden rounded-xl border border-[#e6eaf2] bg-white">
                <div className="flex items-center justify-between border-b border-[#edf0f5] px-3 py-2.5"><span className="text-[8px] font-extrabold text-[#17213e] sm:text-[9px]">Recovery cases</span><span className="text-[7px] font-bold text-[#2f5bff]">View all</span></div>
                {cases.map((row, index) => <div key={row[0]} className={`grid grid-cols-[1fr_auto] items-center gap-2 px-3 py-2.5 sm:grid-cols-[1fr_.65fr_.65fr] sm:py-3 ${index < cases.length - 1 ? "border-b border-[#f0f2f6]" : ""}`}><div className="min-w-0"><p className="truncate font-mono text-[6px] font-bold text-[#3c4761] sm:text-[7px]">{row[0]}</p><p className="mt-1 truncate text-[7px] text-[#9aa2b2]">{row[1]}</p></div><span className="hidden text-[8px] font-extrabold text-[#26314c] sm:inline">{row[2]}</span><span className={`rounded-full px-2 py-1 text-center text-[6px] font-extrabold ${row[4] === "green" ? "bg-emerald-50 text-emerald-700" : row[4] === "amber" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-[#2f5bff]"}`}>{row[3]}</span></div>)}
              </div>

              <div className="hidden rounded-xl border border-[#e6eaf2] bg-white p-3.5 lg:block">
                <p className="text-[7px] font-extrabold uppercase tracking-[.12em] text-[#2f5bff]">Decision trace</p>
                <p className="mt-2 text-[11px] font-extrabold text-[#17213e]">Customer-fixable failure</p>
                <p className="mt-2 text-[8px] leading-4 text-[#7e879a]">Gemini recommends a recovery link. Merchant policy approves within amount and confidence limits.</p>
                <div className="mt-4 rounded-lg bg-[#f7f9fd] p-2.5"><p className="text-[7px] font-bold text-[#99a1b0]">CONFIDENCE</p><div className="mt-1.5 flex items-center justify-between"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e7ebf3]"><div className="h-full w-[92%] rounded-full bg-[#2f5bff]"/></div><span className="ml-2 text-[8px] font-extrabold text-[#24314e]">92%</span></div></div>
                <div className="mt-2.5 flex items-center gap-1.5 text-[7px] font-bold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>Policy approved</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkflowCard({ num, title, body }: { num: string; title: string; body: string }) {
  return <div className="group rounded-[17px] border border-[#e4e9f2] bg-white p-5 shadow-[0_4px_16px_rgba(22,34,70,.025)] transition duration-300 hover:-translate-y-1 hover:border-[#d4ddef] hover:shadow-[0_16px_36px_rgba(22,34,70,.07)] sm:p-6"><div className="flex items-center justify-between"><span className="text-[9px] font-extrabold text-[#2f5bff]">{num}</span><span className="h-6 w-6 rounded-full border border-[#e4e9f2] transition group-hover:border-[#cfd9ef] group-hover:bg-[#f7f9ff]"/></div><h3 className="mt-5 text-[15px] font-[740] tracking-[-0.025em] text-[#16213f]">{title}</h3><p className="mt-3 text-[11px] leading-5 text-[#788196]">{body}</p></div>;
}

function StoryPhoto({
  src,
  alt,
  label,
  className,
  imageClassName = "",
  sizes,
}: {
  src: string;
  alt: string;
  label: string;
  className: string;
  imageClassName?: string;
  sizes: string;
}) {
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
          <div className="mt-6 flex flex-wrap gap-2">
            {["Online commerce", "Payment operations", "Customer experience"].map((item) => <span key={item} className="rounded-full border border-[#e1e6ef] bg-[#fafbfe] px-3 py-1.5 text-[8px] font-bold text-[#69758d]">{item}</span>)}
          </div>
          <Link href="/cases" className="mt-7 inline-flex items-center gap-2 text-[10px] font-extrabold text-[#2f5bff] hover:underline">See the recovery workspace <Arrow className="h-3.5 w-3.5"/></Link>
        </div>

        <div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-12 sm:grid-rows-2 sm:gap-3">
            <StoryPhoto
              src={STORY_IMAGES.operator}
              alt="Illustrative business professional working on a laptop in an office"
              label="Merchant operations"
              className="col-span-2 aspect-[16/10] sm:col-span-7 sm:row-span-2 sm:aspect-auto sm:min-h-[470px]"
              imageClassName="object-[center_28%]"
              sizes="(max-width: 639px) 100vw, 58vw"
            />
            <StoryPhoto
              src={STORY_IMAGES.fulfillment}
              alt="Illustrative small-business order fulfillment with a laptop and parcels"
              label="Order fulfillment"
              className="col-span-1 aspect-[4/3] sm:col-span-5"
              imageClassName="object-center"
              sizes="(max-width: 639px) 50vw, 36vw"
            />
            <StoryPhoto
              src={STORY_IMAGES.team}
              alt="Illustrative professional working on a laptop"
              label="Digital-first teams"
              className="col-span-1 aspect-[4/3] sm:col-span-5"
              imageClassName="object-[center_38%]"
              sizes="(max-width: 639px) 50vw, 36vw"
            />
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
        <div className="surface-grid absolute inset-0 opacity-65 [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
        <div className="soft-orb left-[5%] top-[12%]"/><div className="soft-orb soft-orb-secondary right-[4%] top-[24%]"/>
        <div className="relative mx-auto max-w-[1220px] px-4 pb-20 pt-16 text-center sm:px-5 sm:pb-24 sm:pt-20 md:px-7 md:pb-28 md:pt-28">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#dfe6f6] bg-white/88 px-3 py-1.5 text-[8px] font-extrabold uppercase tracking-[0.13em] text-[#50607e] shadow-sm backdrop-blur sm:text-[9px]"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>Built on Razorpay Test Mode</div>
          <h1 className="mx-auto mt-6 max-w-[940px] text-[clamp(2.6rem,10vw,4.9rem)] font-[790] leading-[.99] tracking-[-0.06em] text-[#0f1933]">Recover failed payments.<br/><span className="text-[#2f5bff]">Without blind retries.</span></h1>
          <p className="mx-auto mt-6 max-w-[700px] text-[13px] leading-6 text-[#68738c] sm:text-[14px] sm:leading-7 md:text-[16px]">RecoverFlow understands why a payment failed, chooses a bounded next action, enforces merchant safeguards, and executes recovery through Razorpay — while protecting customers from duplicate collection.</p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center sm:gap-3"><Link href="/dashboard" className="inline-flex items-center justify-center gap-2 rounded-[11px] bg-[#2f5bff] px-5 py-3.5 text-[11px] font-bold text-white shadow-[0_12px_28px_rgba(47,91,255,.26)] transition hover:-translate-y-0.5 hover:bg-[#244fe0] sm:text-[12px]">Open recovery console <Arrow /></Link><a href="#platform" className="rounded-[11px] border border-[#dde3ee] bg-white px-5 py-3.5 text-[11px] font-bold text-[#32405e] shadow-sm transition hover:border-[#cdd6e8] hover:bg-[#fafbfe] sm:text-[12px]">See the recovery flow</a></div>
          <div className="mx-auto mt-12 max-w-[980px] sm:mt-16"><ProductPreview /></div>
        </div>
      </section>

      <section className="border-y border-[#edf0f5] bg-[#111a35] text-white">
        <div className="mx-auto grid max-w-[1120px] gap-6 px-5 py-8 sm:grid-cols-3 md:px-7 md:py-10">
          {[["Context before action", "Different failure reasons produce different recovery paths."], ["Merchant-controlled autonomy", "AI can recommend; deterministic policy controls money-moving execution."], ["Late-success protection", "Open recovery paths stop when the original payment succeeds late."]].map(([title, body], index) => <div key={title} className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-[8px] font-extrabold text-[#91a7ff]">0{index + 1}</span><div><p className="text-[11px] font-bold text-white">{title}</p><p className="mt-1.5 text-[9px] leading-4 text-[#aeb9d3]">{body}</p></div></div>)}
        </div>
      </section>

      <section id="platform" className="bg-[#fbfcfe]">
        <div className="mx-auto max-w-[1120px] px-5 py-20 md:px-7 md:py-24">
          <div className="grid gap-12 lg:grid-cols-[.78fr_1.22fr] lg:items-start">
            <div className="lg:sticky lg:top-28"><p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#2f5bff]">Recovery orchestration</p><h2 className="mt-3 text-[34px] font-[770] leading-[1.08] tracking-[-0.045em] text-[#121d39] md:text-[44px]">A decision layer between payment failure and the next collection attempt.</h2><p className="mt-5 max-w-md text-[13px] leading-6 text-[#707a91]">The system first establishes context, then chooses between recovery, verification and escalation. That separation makes every action easier to reason about and audit.</p><Link href="/cases" className="mt-6 inline-flex items-center gap-2 text-[10px] font-extrabold text-[#2f5bff] hover:underline">Explore recovery cases <Arrow className="h-3.5 w-3.5"/></Link></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <WorkflowCard num="01" title="Understand the failure" body="Normalize Razorpay failure context — source, step, reason, amount and payment method — before taking action."/>
              <WorkflowCard num="02" title="Propose one bounded action" body="Gemini selects recover, wait-and-verify, or escalate with structured confidence and operational rationale."/>
              <WorkflowCard num="03" title="Apply merchant safeguards" body="Amount limits, confidence thresholds, attempt caps and terminal-state checks stay deterministic and merchant-controlled."/>
              <WorkflowCard num="04" title="Execute and reconcile" body="Approved recovery runs through Razorpay Payment Links while signed webhooks reconcile the final payment state."/>
            </div>
          </div>
        </div>
      </section>

      <MerchantStories />

      <section id="safety" className="border-y border-[#edf0f5] bg-white">
        <div className="mx-auto max-w-[1120px] px-5 py-20 md:px-7 md:py-24">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="rounded-[22px] bg-[#111a35] p-7 text-white shadow-[0_24px_70px_rgba(16,26,53,.18)] md:p-9">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#8fa8ff]">Safety architecture</p><h3 className="mt-4 text-[30px] font-[760] leading-tight tracking-[-0.04em]">AI proposes.<br/>Policy decides.<br/><span className="text-[#89a4ff]">Razorpay executes.</span></h3>
              <div className="mt-8 space-y-3">{["Merchant-defined autonomous amount ceiling", "Minimum model-confidence threshold", "Maximum recovery-attempt limit", "Mandatory wait-and-verify and escalation exits", "Late-success cancellation before duplicate collection"].map((text) => <div key={text} className="flex items-center gap-3 border-b border-white/8 pb-3 last:border-0"><Check/><span className="text-[11px] font-medium text-[#d5dcf0]">{text}</span></div>)}</div>
            </div>
            <div><p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#2f5bff]">Built for payment uncertainty</p><h2 className="mt-3 text-[34px] font-[770] leading-[1.08] tracking-[-0.045em] text-[#121d39] md:text-[44px]">The safest retry is sometimes no retry at all.</h2><p className="mt-5 text-[13px] leading-6 text-[#707a91]">Gateway timeouts and ambiguous states can resolve late. RecoverFlow keeps those cases in verification rather than immediately opening another collection path. If the original payment later succeeds, any open recovery link is cancelled and the protection is recorded.</p><Link href="/settings/policy" className="mt-6 inline-flex items-center gap-2 text-[10px] font-extrabold text-[#2f5bff] hover:underline">View merchant safeguards <Arrow className="h-3.5 w-3.5"/></Link></div>
          </div>
        </div>
      </section>

      <section id="insights" className="bg-[#f8faff]">
        <div className="mx-auto max-w-[1120px] px-5 py-20 md:px-7 md:py-24">
          <div className="mx-auto max-w-[720px] text-center"><p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#2f5bff]">Merchant insights</p><h2 className="mt-3 text-[34px] font-[770] tracking-[-0.045em] text-[#121d39] md:text-[44px]">See revenue recovery as an operating system, not a retry counter.</h2><p className="mt-4 text-[13px] leading-6 text-[#737d92]">Track recovered value, revenue still at risk, failure mix, case states and duplicate-risk protection in one operational view.</p></div>
          <div className="mx-auto mt-10 grid max-w-[900px] gap-3 sm:grid-cols-3">{[["Recovery performance", "Recovered value and active revenue at risk."], ["Failure intelligence", "See which failure reasons dominate your recovery workload."], ["Safety signals", "Track late-success protection and cases that require attention."]].map(([title, body]) => <div key={title} className="rounded-[16px] border border-[#e0e6f1] bg-white p-5 text-left shadow-[0_4px_16px_rgba(22,34,70,.025)]"><span className="mb-4 block h-1 w-8 rounded-full bg-[#2f5bff]"/><p className="text-[12px] font-extrabold text-[#22304d]">{title}</p><p className="mt-2 text-[10px] leading-5 text-[#7c8699]">{body}</p></div>)}</div>
          <div className="mt-8 text-center"><Link href="/analytics" className="inline-flex items-center gap-2 rounded-[10px] border border-[#dce3ef] bg-white px-4 py-2.5 text-[10px] font-bold text-[#33405d] transition hover:border-[#c9d4e7] hover:shadow-sm">Open recovery insights <Arrow className="h-3.5 w-3.5"/></Link></div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[980px] px-5 py-20 text-center md:px-7 md:py-24">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#2f5bff]">Recovery with context</p><h2 className="mx-auto mt-3 max-w-[760px] text-[36px] font-[780] leading-[1.05] tracking-[-.05em] text-[#121d39] md:text-[48px]">Turn failed payments into decisions your team can trust.</h2><p className="mx-auto mt-5 max-w-[610px] text-[13px] leading-6 text-[#737d92]">Use the live console to inspect recovery cases, test policy behavior and follow each decision through to Razorpay execution.</p><div className="mt-7 flex flex-col justify-center gap-2.5 sm:flex-row"><Link href="/dashboard" className="inline-flex items-center justify-center gap-2 rounded-[11px] bg-[#2f5bff] px-5 py-3.5 text-[11px] font-bold text-white shadow-[0_12px_28px_rgba(47,91,255,.22)] transition hover:-translate-y-0.5 hover:bg-[#244fe0]">Open recovery console <Arrow/></Link><Link href="/simulator" className="rounded-[11px] border border-[#dde3ee] bg-white px-5 py-3.5 text-[11px] font-bold text-[#33405d] transition hover:bg-[#fafbfe]">Open test sandbox</Link></div></div>
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