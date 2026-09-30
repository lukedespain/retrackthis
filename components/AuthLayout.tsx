import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

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
    <>
      <SiteHeader />
      <main className="auth">
        <div className="auth-card">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : <p />}
          {children}
          {footer ? <div className="auth-foot">{footer}</div> : null}
        </div>
      </main>
    </>
  );
}

export function AuthFooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="link">
      {children}
    </Link>
  );
}
