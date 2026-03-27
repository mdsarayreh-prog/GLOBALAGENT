import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { getServerSession } from "@/lib/server/authSession";

export const metadata: Metadata = {
  title: "Sign In | Global Agent",
  description: "Secure enterprise SSO sign-in for Global Agent operations.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession();
  if (session) {
    redirect("/user");
  }

  const resolvedSearchParams = await searchParams;
  const error = typeof resolvedSearchParams.error === "string" ? resolvedSearchParams.error : null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030b14] text-slate-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-95 [filter:saturate(1.18)_contrast(1.1)_brightness(1.06)]"
        style={{
          backgroundImage: "url('/joramco-background.gif')",
          backgroundPosition: "center",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1160px 560px at 16% -10%, rgba(56, 189, 248, 0.12), transparent 62%), radial-gradient(920px 460px at 88% -14%, rgba(14, 116, 144, 0.11), transparent 62%), linear-gradient(142deg, rgba(4, 12, 24, 0.18), rgba(2, 9, 18, 0.28))",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(920px 540px at 16% 90%, rgba(2, 7, 16, 0.58), rgba(3, 10, 20, 0.34) 55%, rgba(4, 11, 23, 0.08) 70%, rgba(5, 13, 26, 0) 100%), linear-gradient(94deg, rgba(2, 7, 16, 0.34) 0%, rgba(4, 11, 23, 0.18) 42%, rgba(5, 13, 26, 0) 72%)",
        }}
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1280px] items-end justify-center px-4 pb-8 pt-24 sm:px-8 sm:pb-10 sm:pt-28 lg:px-12 lg:pb-14 lg:pt-32">
        <section className="flex w-full justify-center">
          <div className="w-full max-w-[780px] rounded-[30px] border border-white/14 bg-[rgba(6,10,20,0.44)] px-6 py-6 shadow-[0_18px_48px_rgba(2,7,18,0.36)] sm:px-8 sm:py-7 lg:px-9 lg:py-7">
            <p className="text-[0.74rem] font-semibold uppercase tracking-[0.19em] text-sky-100/78">
              JORAMCO AI WORKSPACE
            </p>
            <h1 className="mt-3.5 max-w-[15ch] font-display text-[2.25rem] font-semibold leading-[1.02] tracking-[-0.022em] text-white sm:text-[2.75rem] lg:text-[2.95rem]">
              Global Agent
            </h1>
            <p className="mt-4 max-w-[38rem] text-[1rem] leading-7 tracking-[0.01em] text-slate-100/86">
              Route every request to the right AI specialist, preserve conversation history, and keep every action traceable.
            </p>

            {error && (
              <p className="mt-5 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                Microsoft sign-in failed: {error}
              </p>
            )}

            <Link
              href="/api/auth/login/microsoft"
              className="mt-6 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-cyan-100/55 bg-gradient-to-r from-cyan-300 via-sky-300 to-sky-400 px-8 text-[15px] font-semibold tracking-[0.012em] text-slate-950 shadow-[0_10px_30px_rgba(56,189,248,0.32)] transition-all duration-200 hover:-translate-y-0.5 hover:from-cyan-200 hover:via-sky-200 hover:to-sky-300 hover:shadow-[0_14px_34px_rgba(56,189,248,0.42)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(6,10,20,0.9)] sm:mt-6 sm:w-auto"
            >
              Continue with SSO
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
