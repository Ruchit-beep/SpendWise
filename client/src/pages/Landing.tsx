import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SpendwiseTape from '../components/ui/spendwise-tape'
import { api } from '../lib/api'
import { formatMoney } from '../lib/format'

const STEPS = [
  ['1', 'Create your free account', 'Sign up with your email. No card, no spreadsheets.', '#C9F227'],
  ['2', 'Log what you earn and spend', 'Add transactions in seconds with the category and payment method.', '#F4A3C7'],
  ['3', 'Set budgets and goals', 'Limits for the month, targets for the things you are saving toward.', '#83CFF0'],
  ['4', 'See where it all goes', 'Charts and plain-English insights built from your own numbers.', '#F28B45'],
]

const BENEFITS = [
  ['Know your numbers', 'See income, expenses and savings for every month in one calm view.'],
  ['Stop overspending early', 'Budget bars turn orange near the limit and red when you pass it.'],
  ['Save for what matters', 'Goals with target dates and progress you can actually see.'],
  ['Take it with you', 'Export CSV and PDF summaries any time. Your data is yours.'],
]

const TESTIMONIALS = [
  ['“I finally know where my chai money goes.”', 'Demo persona: college student'],
  ['“Budget alerts saved me from a very expensive weekend.”', 'Demo persona: young professional'],
  ['“Invoices in, rent out, goals on track. Simple.”', 'Demo persona: freelancer'],
]

const FAQ = [
  ['Is SpendWise free?', 'Yes. You can create an account and use every feature at no cost.'],
  ['Which currencies are supported?', 'INR (₹) is the default. You can switch to USD, EUR, GBP, AED, AUD, CAD, SGD or JPY in Settings. Switching changes how amounts display; it does not convert them.'],
  ['Is my data private?', 'Your records are tied to your account and only you can read them. Passwords are stored hashed, never in plain text.'],
  ['Can I try it with sample data?', 'Yes. After signing up you can load clearly-labelled sample data, explore, and remove it with one click.'],
  ['Can I take my data with me?', 'Yes. Export your transactions as CSV or a summary as PDF from the Analytics page.'],
]

function Preview() {
  const [budget, setBudget] = useState(25000)
  const spent = 16000
  const pct = Math.min(100, (spent / budget) * 100)
  const tone = spent > budget ? '#ef4444' : pct >= 80 ? '#F28B45' : '#C9F227'
  const bars = [38, 52, 44, 61, 49, 57]
  return (
    <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
      <div className="rounded-3xl border-[3px] border-[#242424] bg-white p-5 text-[#242424] shadow-[0_6px_0_#242424]">
        <p className="text-xs font-bold uppercase tracking-wide opacity-60">Sample preview · not real data</p>
        <p className="mt-2 font-display text-lg font-extrabold">Monthly budget</p>
        <p className="font-display text-3xl font-extrabold tabular-nums">{formatMoney(spent)} <span className="text-base font-semibold opacity-60">of {formatMoney(budget)}</span></p>
        <div className="my-3 h-4 overflow-hidden rounded-full border-2 border-[#242424] bg-[#242424]/5"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: tone }} /></div>
        <p className="text-sm font-semibold">{spent <= budget ? `${formatMoney(budget - spent)} remaining` : `${formatMoney(spent - budget)} over`}</p>
        <label className="mt-4 block text-xs font-bold uppercase">Try a different budget
          <input type="range" min={10000} max={40000} step={1000} value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="mt-1 w-full accent-[#242424]" aria-label="Monthly budget" />
        </label>
      </div>
      <div className="rounded-3xl border-[3px] border-[#242424] bg-[#FFFDF4] p-5 text-[#242424] shadow-[0_6px_0_#242424]">
        <p className="text-xs font-bold uppercase tracking-wide opacity-60">Sample preview · not real data</p>
        <p className="mt-2 font-display text-lg font-extrabold">Income vs expenses</p>
        <div className="mt-4 flex h-36 items-end gap-3" aria-hidden="true">
          {bars.map((h, i) => (
            <div key={i} className="flex flex-1 items-end gap-1">
              <div className="w-1/2 rounded-t-md border-2 border-[#242424] bg-[#C9F227]" style={{ height: `${h + 20}%` }} />
              <div className="w-1/2 rounded-t-md border-2 border-[#242424] bg-[#F28B45]" style={{ height: `${h}%` }} />
            </div>
          ))}
        </div>
        <p className="mt-3 font-hand text-2xl text-[#F28B45]">your real charts update as you add transactions</p>
      </div>
    </div>
  )
}

function Extras({ onStart }: { onStart: () => void }) {
  return (
    <div className="bg-[#FFFDF4] text-[#242424]">
      <section className="px-5 py-16 sm:px-10" aria-labelledby="how">
        <p className="text-center font-hand text-3xl text-[#F28B45]">easy as 1-2-3-4</p>
        <h2 id="how" className="mb-10 text-center font-anton text-5xl uppercase tracking-wide sm:text-6xl">How it works</h2>
        <ol className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([n, t, d, c]) => (
            <li key={n} className="rounded-3xl border-[3px] border-[#242424] p-5 shadow-[0_5px_0_#242424]" style={{ background: c }}>
              <span className="font-anton text-5xl">{n}</span>
              <h3 className="mt-2 font-display text-lg font-extrabold leading-tight">{t}</h3>
              <p className="mt-1 text-sm font-medium">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-[#242424] px-5 py-16 text-[#FFFDF4] sm:px-10" aria-labelledby="why">
        <h2 id="why" className="mb-10 text-center font-anton text-5xl uppercase tracking-wide sm:text-6xl">Why <span className="text-[#C9F227]">SpendWise</span></h2>
        <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2">
          {BENEFITS.map(([t, d]) => (
            <div key={t} className="rounded-2xl border-2 border-[#FFFDF4]/30 p-5"><h3 className="font-display text-xl font-extrabold text-[#C9F227]">{t}</h3><p className="mt-1 text-[#FFFDF4]/80">{d}</p></div>
          ))}
        </div>
      </section>

      <section className="px-5 py-16 sm:px-10" aria-labelledby="peek">
        <h2 id="peek" className="mb-2 text-center font-anton text-5xl uppercase tracking-wide sm:text-6xl">Peek inside</h2>
        <p className="mb-8 text-center font-hand text-3xl text-[#F28B45]">go on, drag the slider</p>
        <Preview />
        <div className="mt-8 text-center"><button className="btn-primary" onClick={onStart}>Get Started Free</button></div>
      </section>

      <section className="bg-[#F4A3C7] px-5 py-16 sm:px-10" aria-labelledby="love">
        <h2 id="love" className="mb-2 text-center font-anton text-5xl uppercase tracking-wide sm:text-6xl">Kind words</h2>
        <p className="mb-8 text-center text-sm font-bold">Demo content: these quotes are illustrative examples, not real customers.</p>
        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
          {TESTIMONIALS.map(([q, w], i) => (
            <figure key={q} className="rounded-2xl border-[3px] border-[#242424] bg-[#FFFDF4] p-5 shadow-[0_5px_0_#242424]" style={{ transform: `rotate(${[-1.5, 1, -0.7][i]}deg)` }}>
              <blockquote className="font-display text-lg font-bold leading-snug">{q}</blockquote>
              <figcaption className="mt-3 font-hand text-xl text-[#F28B45]">{w}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="px-5 py-16 sm:px-10" aria-labelledby="faq">
        <h2 id="faq" className="mb-8 text-center font-anton text-5xl uppercase tracking-wide sm:text-6xl">Questions?</h2>
        <div className="mx-auto max-w-3xl space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group rounded-2xl border-[3px] border-[#242424] bg-white p-4">
              <summary className="cursor-pointer list-none font-display text-lg font-extrabold marker:hidden">{q}</summary>
              <p className="mt-2 text-[#242424]/80">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}

export default function Landing() {
  const nav = useNavigate()
  const start = () => nav('/signup')
  return (
    <SpendwiseTape
      className="sw-landing"
      fontHref={null}
      height="100svh"
      onStart={start}
      onLogin={() => nav('/login')}
      onSubscribe={async (email) => (await api.post<{ message: string }>('/newsletter', { email })).message}
      afterShop={<Extras onStart={start} />}
    />
  )
}
