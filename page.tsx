import { ArrowRight, Bell, Calculator, Radar, ShieldCheck, TrendingUp } from "lucide-react";
import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { seedConfig } from "@/lib/env";
import { getOddsProvider } from "@/lib/providers";

export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: Radar, title: "Live scanner", text: "Normalized odds from a licensed provider, de-duplicated events and theoretical margins ranked in real time." },
  { icon: Calculator, title: "Two- & three-way calculator", text: "Stake allocation, rounding, commission, FX and fixed costs — see worst-case and net estimates instantly." },
  { icon: Bell, title: "Smart alerts", text: "Minimum margin, preferred sports, markets and bookmakers. Duplicate-free, in-app first." },
  { icon: ShieldCheck, title: "Built for trust", text: "Freshness indicators, odds-movement and stale-data warnings. Theoretical, never 'guaranteed'." },
];

export default async function WelcomePage() {
  const user = await getSessionUser();
  const provider = getOddsProvider();
  const showDemoCreds = provider.isDemo && process.env.SHOW_DEMO_CREDENTIALS !== "false";
  const seeds = seedConfig();

  return (
    <main className="min-h-screen bg-bg text-fg">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary">
            <TrendingUp className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold">Arbitrage Finder Pro</span>
        </div>
        <nav className="flex items-center gap-2">
          {user ? (
            <LinkButton href="/app" size="sm">
              Open dashboard <ArrowRight className="h-4 w-4" />
            </LinkButton>
          ) : (
            <>
              <LinkButton href="/login" variant="ghost" size="sm">
                Sign in
              </LinkButton>
              <LinkButton href="/register" size="sm">
                Create account
              </LinkButton>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-5 pt-10 pb-16 sm:pt-16">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted">
          <span className="h-2 w-2 rounded-full bg-profit" /> {provider.isDemo ? "Running on seeded demo data" : `Connected to ${provider.name}`}
        </p>
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Find theoretical sports arbitrage, <span className="text-profit">analyse it honestly</span>, act with discipline.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted sm:text-lg">
          A mobile-first scanner, calculator and alerting workspace. Every opportunity shows its implied margin, bookmaker legs, data freshness and the costs that
          separate a theoretical edge from an executable one.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <LinkButton href={user ? "/app" : "/register"} size="lg">
            {user ? "Go to dashboard" : "Start for free"} <ArrowRight className="h-4 w-4" />
          </LinkButton>
          {!user && (
            <LinkButton href="/login" variant="outline" size="lg">
              I already have an account
            </LinkButton>
          )}
        </div>
        {showDemoCreds && !user && (
          <div className="mt-6 inline-block rounded-xl border border-border bg-surface p-4 text-sm">
            <p className="font-medium">Demo accounts (sample data only)</p>
            <p className="mt-1 font-mono text-xs text-muted">
              user: {seeds.demoEmail} / {seeds.demoPassword}
              <br />
              admin: {seeds.adminEmail} / {seeds.adminPassword}
            </p>
          </div>
        )}
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-16 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-2xl border border-border bg-surface p-5">
            <f.icon className="h-6 w-6 text-primary" />
            <h2 className="mt-3 text-base font-semibold">{f.title}</h2>
            <p className="mt-1 text-sm text-muted">{f.text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <h2 className="text-xl font-semibold">How it works</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            ["Scan", "Odds are normalized per event, market and bookmaker. The engine keeps the best price per outcome and computes S = Σ 1/oᵢ."],
            ["Analyse", "If S < 1 a theoretical arbitrage exists. Allocate stakes, apply rounding and fees, and check the worst-case outcome."],
            ["Act responsibly", "Odds move, limits apply and bets can be voided. Use alerts and freshness indicators; never treat an estimate as guaranteed profit."],
          ].map(([title, text], i) => (
            <li key={title} className="rounded-2xl border border-border bg-surface p-5">
              <span className="text-xs font-semibold text-primary">STEP {i + 1}</span>
              <h3 className="mt-1 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-5 py-8 text-xs text-muted">
          <p>
            Arbitrage Finder Pro is an analysis tool. It does not place bets, does not provide financial advice and cannot guarantee any return. Sports betting involves risk
            and may be restricted in your jurisdiction. Please gamble responsibly.
          </p>
          <p className="mt-2">
            <Link href="/login" className="underline">
              Sign in
            </Link>{" "}
            ·{" "}
            <Link href="/register" className="underline">
              Create account
            </Link>
          </p>
        </div>
      </footer>
    </main>
  );
}
