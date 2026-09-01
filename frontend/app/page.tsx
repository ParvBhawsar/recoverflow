import Link from "next/link";
import { Brand } from "@/components/app-shell";

function Arrow() {
  return <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h12"/><path d="m11.5 5.5 4.5 4.5-4.5 4.5"/></svg>;
}

function Check() {
  return <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600"><svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 10 3 3 7-7"/></svg></span>;
}

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[760px] animate-float-soft">
      <div className="absolute -inset-8 -z-10 rounded-[40px] bg-[#2f5bff]/8 blur-3xl" />
      <div className="overflow-hidden rounded-[20px] border border-[#dfe5f0] bg-white shadow-[0_28px_90px_rgba(28,45,90,.16)]">
        <div className="flex items-center gap-2 border-b border-[#edf0f5] bg-[#fbfcfe] px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#d9dee8]"/><span className="h-2.5 w-2.5 rounded-full bg-[#d9dee8]"/><span className="h-2.5 w-2.5 rounded-full bg-[#d9dee8]"/>
          <span className="ml-3 text-[9px] font-semibold text-[#9ba3b3]">merchant.recoverflow.app</span>
        </div>
        <div className="grid min-h-[430px] grid-cols-[160px_1fr] bg-[#f8f9fc] sm:grid-cols-[190px_1fr]">
          <aside className="border-r border-[#e8ebf2] bg-white p-3.5">
            <div className="mb-5 flex items-center gap-2 px-1"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#2f5bff] text-[9px] font-black text-white">RF</span><span className="text-[10px] font-extrabold text-[#15203c]">RecoverFlow</span></div>
            {[
              ["Overview", true], ["Recovery sandbox", false], ["Analytics", false], ["Safeguards", false]
            ].map(([label, active]) => <div key={String(label)} className={`mb-1 rounded-lg px-3 py-2 text-[9px] font-semibold ${active ? "bg-[#eef3ff] text-[#2f5bff]" : "text-[#7d8799]"}`}>{label}</div>)}
            <div className="mt-6 px-3 text-[7px] font-extrabold uppercase tracking-[.16em] text-[#a9afbb]">Validation</div>
            <div className="mt-2 rounded-lg px-3 py-2 text-[9px] font-semibold text-[#7d8799]">Benchmark</div>
          </aside>
          <div className="p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between"><div><p className="text-[11px] font-extrabold text-[#15203c]">Recovery overview</p><p className="mt-1 text-[8px] text-[#9098aa]">Live merchant payment operations</p></div><button className="rounded-lg bg-[#2f5bff] px-3 py-2 text-[8px] font-bold text-white">Create test case</button></div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[ ["At risk", "₹18,400"], ["Recovered", "₹12,900"], ["Recovery rate", "70.1%"], ["Protected", "₹4,999"] ].map(([label, value]) => <div key={label} className="rounded-xl border border-[#e6eaf2] bg-white p-3"><p className="text-[7px] font-bold uppercase tracking-[.1em] text-[#9aa1af]">{label}</p><p className="mt-2 text-[15px] font-extrabold tracking-tight text-[#17213e]">{value}</p></div>)}
            </div>
            <div className="mt-3.5 grid gap-3 xl:grid-cols-[1.25fr_.75fr]">
              <div className="overflow-hidden rounded-xl border border-[#e6eaf2] bg-white">
                <div className="flex items-center justify-between border-b border-[#edf0f5] px-3 py-2.5"><span className="text-[9px] font-extrabold text-[#17213e]">Recovery queue</span><span className="text-[7px] font-bold text-[#2f5bff]">View all</span></div>
                {[
                  ["pay_8F2A91", "Incorrect OTP", "₹4,999", "Action proposed"],
                  ["pay_17BC44", "Gateway timeout", "₹7,999", "Verify state"],
                  ["pay_A98D11", "Recovered", "₹5,402", "Recovered"],
                ].map((row, index) => <div key={row[0]} className={`grid grid-cols-[1fr_.9fr_.6fr] items-center gap-2 px-3 py-3 ${index < 2 ? "border-b border-[#f0f2f6]" : ""}`}><div><p className="font-mono text-[7px] font-bold text-[#3c4761]">{row[0]}</p><p className="mt-1 text-[7px] text-[#9aa2b2]">{row[1]}</p></div><span className="text-[8px] font-extrabold text-[#26314c]">{row[2]}</span><span className={`rounded-full px-2 py-1 text-center text-[6px] font-extrabold ${index === 2 ? "bg-emerald-50 text-emerald-700" : index === 1 ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-[#2f5bff]"}`}>{row[3]}</span></div>)}
              </div>
              <div className="rounded-xl border border-[#e6eaf2] bg-white p-3.5">
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

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-[#111a35]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#e8ebf2]/80 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-[1220px] items-center gap-8 px-5 md:px-7">
          <Brand />
          <nav className="hidden flex-1 items-center justify-center gap-7 md:flex">
            <a href="#platform" className="text-[11px] font-semibold text-[#687288] transition hover:text-[#1a2746]">Platform</a>
            <a href="#safety" className="text-[11px] font-semibold text-[#687288] transition hover:text-[#1a2746]">Safeguards</a>
            <a href="#evidence" className="text-[11px] font-semibold text-[#687288] transition hover:text-[#1a2746]">Evaluation</a>
            <a href="https://recoverflow-api-ul43.onrender.com/docs" target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-[#687288] transition hover:text-[#1a2746]">API</a>
          </nav>
          <Link href="/dashboard" className="ml-auto inline-flex items-center gap-2 rounded-[10px] bg-[#17213f] px-4 py-2.5 text-[11px] font-bold text-white shadow-[0_7px_18px_rgba(23,33,63,.16)] transition hover:-translate-y-0.5 hover:bg-[#0e1833]">Open console <Arrow /></Link>
        </div>
      </header>

      <section className="hero-glow relative overflow-hidden pt-[68px]">
        <div className="surface-grid absolute inset-0 opacity-70 [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
        <div className="relative mx-auto max-w-[1220px] px-5 pb-24 pt-20 text-center md:px-7 md:pb-28 md:pt-28">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#dfe6f6] bg-white/85 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.13em] text-[#50607e] shadow-sm backdrop-blur"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>Connected to Razorpay Test Mode</div>
          <h1 className="mx-auto mt-6 max-w-[900px] text-[44px] font-[790] leading-[1.02] tracking-[-0.055em] text-[#0f1933] md:text-[68px] lg:text-[78px]">Recover failed payments.<br/><span className="text-[#2f5bff]">Without blind retries.</span></h1>
          <p className="mx-auto mt-6 max-w-[680px] text-[14px] leading-7 text-[#68738c] md:text-[16px]">RecoverFlow diagnoses payment failures, proposes the safest next action, enforces merchant guardrails, and executes recovery through Razorpay — with duplicate-charge protection built in.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3"><Link href="/dashboard" className="inline-flex items-center gap-2 rounded-[11px] bg-[#2f5bff] px-5 py-3.5 text-[12px] font-bold text-white shadow-[0_12px_28px_rgba(47,91,255,.26)] transition hover:-translate-y-0.5 hover:bg-[#244fe0]">Open recovery console <Arrow /></Link><a href="#platform" className="rounded-[11px] border border-[#dde3ee] bg-white px-5 py-3.5 text-[12px] font-bold text-[#32405e] shadow-sm transition hover:border-[#cdd6e8] hover:bg-[#fafbfe]">See how it works</a></div>
          <div className="mx-auto mt-16 max-w-[940px]"><ProductPreview /></div>
        </div>
      </section>

      <section id="platform" className="border-y border-[#edf0f5] bg-[#fbfcfe]">
        <div className="mx-auto max-w-[1120px] px-5 py-20 md:px-7 md:py-24">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
            <div className="lg:sticky lg:top-28"><p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#2f5bff]">Recovery orchestration</p><h2 className="mt-3 text-[34px] font-[770] leading-[1.08] tracking-[-0.045em] text-[#121d39] md:text-[42px]">A decision layer between payment failure and the next collection attempt.</h2><p className="mt-5 max-w-md text-[13px] leading-6 text-[#707a91]">Different failures need different responses. RecoverFlow separates diagnosis from execution so the system can wait, recover, or escalate instead of treating every failure as a retry opportunity.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["01", "Understand the failure", "Normalize Razorpay failure context — source, step, reason, amount and payment method — before any recovery action."],
                ["02", "Propose one bounded action", "Gemini selects from recover, wait-and-verify, or escalate with a structured confidence score and operational reason."],
                ["03", "Apply merchant policy", "Amount limits, minimum confidence, attempt caps and terminal-state checks remain deterministic and merchant-controlled."],
                ["04", "Execute and reconcile", "Approved recovery runs through Razorpay Payment Links and signed webhooks update the case back to a final state."],
              ].map(([num, title, body]) => <div key={num} className="group rounded-[16px] border border-[#e4e9f2] bg-white p-5 shadow-[0_4px_16px_rgba(22,34,70,.025)] transition duration-300 hover:-translate-y-1 hover:border-[#d4ddef] hover:shadow-[0_14px_34px_rgba(22,34,70,.07)]"><span className="text-[9px] font-extrabold text-[#2f5bff]">{num}</span><h3 className="mt-4 text-[15px] font-[740] tracking-[-0.025em] text-[#16213f]">{title}</h3><p className="mt-3 text-[11px] leading-5 text-[#788196]">{body}</p></div>)}
            </div>
          </div>
        </div>
      </section>

      <section id="safety" className="bg-white">
        <div className="mx-auto max-w-[1120px] px-5 py-20 md:px-7 md:py-24">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="rounded-[22px] bg-[#111a35] p-7 text-white shadow-[0_24px_70px_rgba(16,26,53,.18)] md:p-9">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#8fa8ff]">Safety architecture</p><h3 className="mt-4 text-[30px] font-[760] leading-tight tracking-[-0.04em]">AI proposes.<br/>Policy decides.<br/><span className="text-[#89a4ff]">Razorpay executes.</span></h3>
              <div className="mt-8 space-y-3">{["Configurable autonomous amount ceiling", "Minimum confidence threshold", "Maximum recovery-attempt limit", "Mandatory wait-and-verify + escalation exits", "Late-success cancellation before duplicate collection"].map((text) => <div key={text} className="flex items-center gap-3 border-b border-white/8 pb-3 last:border-0"><Check/><span className="text-[11px] font-medium text-[#d5dcf0]">{text}</span></div>)}</div>
            </div>
            <div><p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#2f5bff]">Built for payment uncertainty</p><h2 className="mt-3 text-[34px] font-[770] leading-[1.08] tracking-[-0.045em] text-[#121d39] md:text-[42px]">The safest retry is sometimes no retry at all.</h2><p className="mt-5 text-[13px] leading-6 text-[#707a91]">Gateway timeouts and uncertain final states can succeed late. RecoverFlow keeps those cases in verification instead of opening another collection path immediately. If the original payment later succeeds, any open recovery link is cancelled and the protection is recorded in the audit trail.</p><Link href="/settings/policy" className="mt-6 inline-flex items-center gap-2 text-[11px] font-extrabold text-[#2f5bff] hover:underline">View merchant safeguards <Arrow/></Link></div>
          </div>
        </div>
      </section>

      <section id="evidence" className="border-y border-[#edf0f5] bg-[#f8faff]">
        <div className="mx-auto max-w-[1120px] px-5 py-20 md:px-7 md:py-24">
          <div className="mx-auto max-w-[720px] text-center"><p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#2f5bff]">Evaluation</p><h2 className="mt-3 text-[34px] font-[770] tracking-[-0.045em] text-[#121d39] md:text-[42px]">Prove the strategy, not just the interface.</h2><p className="mt-4 text-[13px] leading-6 text-[#737d92]">A versioned synthetic benchmark compares contextual recovery against a deliberately naive “recover every failure” baseline. Ground-truth labels are withheld during model inference.</p></div>
          <div className="mx-auto mt-10 grid max-w-[900px] gap-3 sm:grid-cols-3">{[["30", "labelled payment scenarios"], ["3", "bounded recovery actions"], ["7", "safety + accuracy metrics"]].map(([value, label]) => <div key={label} className="rounded-[15px] border border-[#e0e6f1] bg-white p-5 text-center"><p className="text-[30px] font-[790] tracking-[-0.05em] text-[#17213f]">{value}</p><p className="mt-1 text-[10px] font-semibold text-[#7f889b]">{label}</p></div>)}</div>
          <div className="mt-8 text-center"><Link href="/analytics/evaluation" className="inline-flex items-center gap-2 rounded-[10px] border border-[#dce3ef] bg-white px-4 py-2.5 text-[11px] font-bold text-[#33405d] transition hover:border-[#c9d4e7] hover:shadow-sm">Open evaluation analytics <Arrow/></Link><p className="mt-3 text-[9px] text-[#9ca3b1]">Evaluation results are synthetic and are not presented as production merchant performance.</p></div>
        </div>
      </section>

      <footer className="bg-white">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-5 px-5 py-9 md:flex-row md:items-center md:justify-between md:px-7"><Brand/><div className="flex flex-wrap gap-5 text-[10px] font-semibold text-[#7e8799]"><Link href="/dashboard" className="hover:text-[#1c2947]">Console</Link><Link href="/simulator" className="hover:text-[#1c2947]">Sandbox</Link><Link href="/analytics/evaluation" className="hover:text-[#1c2947]">Analytics</Link><a href="https://recoverflow-api-ul43.onrender.com/docs" target="_blank" rel="noreferrer" className="hover:text-[#1c2947]">API</a></div><p className="text-[9px] font-medium text-[#a0a7b4]">Designed for Razorpay payment recovery workflows.</p></div>
      </footer>
    </main>
  );
}
