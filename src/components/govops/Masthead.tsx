import { Link } from "@tanstack/react-router";
import { useIntl } from "react-intl";
import { Wordmark } from "./Wordmark";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Masthead() {
  const intl = useIntl();
  return (
    <header
      role="banner"
      className="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur"
    >
      <div className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-4">
        <Link to="/" className="whitespace-nowrap text-2xl text-foreground">
          <Wordmark />
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-4 text-sm">
          <Link
            to="/"
            className="text-foreground-muted transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground font-medium" }}
            activeOptions={{ exact: true }}
          >
            {intl.formatMessage({ id: "nav.home" })}
          </Link>
          <Link
            to="/policies"
            className="text-foreground-muted transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground font-medium" }}
          >
            {intl.formatMessage({ id: "nav.policies" })}
          </Link>
          <Link
            to="/config"
            className="text-foreground-muted transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground font-medium" }}
          >
            {intl.formatMessage({ id: "nav.config" })}
          </Link>
          <Link
            to="/config/approvals"
            className="text-foreground-muted transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground font-medium" }}
          >
            {intl.formatMessage({ id: "nav.approvals" })}
          </Link>
          <Link
            to="/about"
            className="text-foreground-muted transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground font-medium" }}
          >
            {intl.formatMessage({ id: "nav.about" })}
          </Link>
        </nav>

        <div className="ms-auto flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
