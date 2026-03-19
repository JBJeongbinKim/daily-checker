"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./bottom-nav.module.css";

const items = [
  { href: "/workout", label: "Workout" },
  { href: "/mercor", label: "Mercor" },
  { href: "/jackpot", label: "Jackpot" },
  { href: "/rent", label: "Rent" }
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Primary">
      {items.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            className={`${styles.link} ${isActive ? styles.active : ""}`.trim()}
            href={item.href}
            key={item.href}
          >
            <span className={styles.label}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
