import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  ChartNoAxesCombined,
  LockKeyhole,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";

export default function AdminPage() {
  const kpis = [
    { label: "Total Requests (24h)", value: "1,842", delta: "+8.1%", tone: "text-emerald-600 dark:text-emerald-300" },
    { label: "Auto-route Accuracy", value: "93.7%", delta: "+1.4%", tone: "text-emerald-600 dark:text-emerald-300" },
    { label: "Avg Resolution Time", value: "7m 12s", delta: "-42s", tone: "text-emerald-600 dark:text-emerald-300" },
    { label: "Escalation Rate", value: "4.8%", delta: "-0.6%", tone: "text-emerald-600 dark:text-emerald-300" },
  ];

  const controls = [
    { title: "Auto-route Policy", description: "Keep Global Agent orchestration enabled for all user requests.", enabled: true },
    { title: "Specialist Visibility", description: "Hide specialist picker in the user workspace.", enabled: true },
    { title: "Trace Retention", description: "Store routing trace logs for governance audit.", enabled: true },
    { title: "High-risk Escalation", description: "Require admin review for risk score over threshold.", enabled: true },
  ];

  const queue = [
    { item: "Policy update campaign", owner: "HR Agent", status: "In review" },
    { item: "VPN incident cluster", owner: "IT Agent", status: "Active" },
    { item: "Q2 replenishment risk", owner: "Supply Agent", status: "Watching" },
    { item: "Role enablement rollout", owner: "Academy Agent", status: "Scheduled" },
  ];

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 md:px-6">
      <div className="mx-auto flex w-full max-w-[1450px] flex-col gap-5">
        <section className="rounded-[18px] border border-slate-300/90 bg-white/90 p-5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <ShieldCheck size={13} />
                Admin Master Control
              </p>
              <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Global Agent Administration
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Configure platform policy, watch orchestration analytics, and control specialist operations from one page.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/workspace"
                className="inline-flex items-center gap-1.5 rounded-[14px] border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500"
              >
                <Bot size={14} />
                Open Admin Workspace
                <ArrowRight size={14} />
              </Link>
              <Link
                href="/user"
                className="inline-flex items-center gap-1.5 rounded-[14px] border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-500"
              >
                <Users size={14} />
                View User Workspace
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <article
              key={kpi.label}
              className="rounded-[16px] border border-slate-300/90 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-900/90"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-500">{kpi.label}</p>
              <p className="mt-2 font-display text-2xl font-semibold text-slate-900 dark:text-slate-100">{kpi.value}</p>
              <p className={`mt-1 text-xs font-semibold ${kpi.tone}`}>{kpi.delta} vs yesterday</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
          <article className="rounded-[16px] border border-slate-300/90 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-900/90">
            <div className="mb-3 flex items-center gap-2">
              <ChartNoAxesCombined size={16} className="text-sky-600 dark:text-sky-300" />
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">Routing Analytics Dashboard</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[14px] border border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/70">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-500">By Department</p>
                <ul className="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <li className="flex items-center justify-between"><span>IT Agent</span><span>31%</span></li>
                  <li className="flex items-center justify-between"><span>HR Agent</span><span>22%</span></li>
                  <li className="flex items-center justify-between"><span>Operations Agent</span><span>19%</span></li>
                  <li className="flex items-center justify-between"><span>Supply Agent</span><span>17%</span></li>
                  <li className="flex items-center justify-between"><span>Academy Agent</span><span>11%</span></li>
                </ul>
              </div>
              <div className="rounded-[14px] border border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/70">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-500">Fallback & Errors</p>
                <ul className="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <li className="flex items-center justify-between"><span>Global fallback</span><span>3.9%</span></li>
                  <li className="flex items-center justify-between"><span>Manual specialist lock</span><span>1.4%</span></li>
                  <li className="flex items-center justify-between"><span>Stream interruptions</span><span>0.2%</span></li>
                </ul>
              </div>
            </div>
            <div className="mt-3 rounded-[14px] border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
              Weekly trend: auto-routing confidence improved across all departments while escalation volume declined.
            </div>
          </article>

          <article className="rounded-[16px] border border-slate-300/90 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-900/90">
            <div className="mb-3 flex items-center gap-2">
              <SlidersHorizontal size={16} className="text-sky-600 dark:text-sky-300" />
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">Admin Options</h2>
            </div>
            <ul className="space-y-2">
              {controls.map((control) => (
                <li key={control.title} className="rounded-[14px] border border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/70">
                  <label className="flex cursor-pointer items-start gap-2">
                    <input type="checkbox" defaultChecked={control.enabled} className="mt-0.5 h-4 w-4 accent-sky-600" />
                    <span>
                      <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">{control.title}</span>
                      <span className="block text-xs leading-5 text-slate-600 dark:text-slate-400">{control.description}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-[16px] border border-slate-300/90 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-900/90">
            <div className="mb-3 flex items-center gap-2">
              <Activity size={16} className="text-sky-600 dark:text-sky-300" />
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">Operations Queue</h2>
            </div>
            <ul className="space-y-2">
              {queue.map((task) => (
                <li key={task.item} className="flex items-center justify-between rounded-[14px] border border-slate-300 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950/70">
                  <span>
                    <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">{task.item}</span>
                    <span className="block text-xs text-slate-600 dark:text-slate-400">{task.owner}</span>
                  </span>
                  <span className="rounded-full border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300">
                    {task.status}
                  </span>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-[16px] border border-slate-300/90 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-900/90">
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 size={16} className="text-sky-600 dark:text-sky-300" />
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">Governance Actions</h2>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-[14px] border border-slate-300 bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-800 transition-colors hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-slate-500"
              >
                Export weekly routing report
                <ArrowRight size={14} />
              </button>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-[14px] border border-slate-300 bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-800 transition-colors hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-slate-500"
              >
                Review escalation exceptions
                <ArrowRight size={14} />
              </button>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-[14px] border border-slate-300 bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-800 transition-colors hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-slate-500"
              >
                Audit agent policy configuration
                <ArrowRight size={14} />
              </button>
            </div>
            <div className="mt-3 rounded-[14px] border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-400">
              <p className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                <LockKeyhole size={12} />
                Admin security
              </p>
              <p className="mt-1">All actions on this page are recorded in the admin audit trail.</p>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
