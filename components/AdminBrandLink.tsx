"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** Footer link. Renders only after /api/auth/me says this person is an admin. */
export function AdminBrandLink() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancel = false;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (!cancel) setShow(Boolean(body?.profile?.isAdmin));
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, []);

  if (!show) return null;
  return <Link href="/brand-kit">Brand kit</Link>;
}
