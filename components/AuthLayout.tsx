import Link from "next/link";
import { Logo } from "./Logo";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-5 py-6 sm:px-6 sm:py-8">
        <Logo />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-5 pb-16 sm:px-6 sm:pb-24">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-gray-500">{subtitle}</p>}
          {children && <div className="mt-6 sm:mt-8">{children}</div>}
          {footer && <div className="mt-6 text-center text-sm text-gray-500 sm:mt-8">{footer}</div>}
        </div>
      </main>
    </div>
  );
}

export function AuthFooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="font-medium text-accent transition-colors duration-150 hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 rounded dark:focus-visible:ring-offset-gray-950"
    >
      {children}
    </Link>
  );
}
