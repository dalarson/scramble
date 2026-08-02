import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_ACCESS_COOKIE,
  getAdminAccessCode,
  hashAdminAccessCode,
  isAdminAccessEnabled,
  sanitizeAdminRedirect,
} from "@/lib/admin-access";

export default async function AdminAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const nextPath = sanitizeAdminRedirect(params.next);
  const error = params.error === "invalid" ? "Incorrect access code." : null;

  async function unlockAdmin(formData: FormData) {
    "use server";

    const configuredCode = getAdminAccessCode();
    const requestedNextPath = sanitizeAdminRedirect(
      String(formData.get("next") ?? "/tournament"),
    );

    if (!configuredCode) {
      redirect(requestedNextPath);
    }

    const submittedCode = String(formData.get("accessCode") ?? "").trim();
    if (!submittedCode) {
      redirect(`/admin-access?error=invalid&next=${encodeURIComponent(requestedNextPath)}`);
    }

    if (submittedCode !== configuredCode) {
      redirect(`/admin-access?error=invalid&next=${encodeURIComponent(requestedNextPath)}`);
    }

    const cookieStore = await cookies();
    cookieStore.set(ADMIN_ACCESS_COOKIE, await hashAdminAccessCode(configuredCode), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    redirect(requestedNextPath);
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md items-center px-4 py-8">
      <section className="w-full rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight">Admin access</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Enter the admin access code to open tournament setup and draft controls.
        </p>

        {!isAdminAccessEnabled() ? (
          <p className="mt-4 rounded-xl bg-amber-100 px-3 py-2 text-sm text-amber-800">
            Set <code>ADMIN_ACCESS_CODE</code> to enable route protection.
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-xl bg-red-100 px-3 py-2 text-sm text-red-800">{error}</p>
        ) : null}

        <form action={unlockAdmin} className="mt-5 grid gap-3">
          <input type="hidden" name="next" value={nextPath} />
          <input
            autoComplete="one-time-code"
            className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            name="accessCode"
            placeholder="Access code"
            type="password"
          />
          <button
            className="rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            type="submit"
          >
            Continue
          </button>
        </form>
      </section>
    </main>
  );
}
