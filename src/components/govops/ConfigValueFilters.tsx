import { useIntl } from "react-intl";
import { DOMAINS, JURISDICTIONS, LANGUAGES } from "@/lib/types";

export type FiltersState = {
  key_prefix: string;
  domain: string;
  jurisdiction_id: string;
  language: string;
};

type Props = {
  value: FiltersState;
  onChange: (next: Partial<FiltersState>) => void;
};

const selectClass =
  "h-9 rounded-md border border-border bg-surface px-2 text-sm text-foreground transition-colors hover:bg-surface-sunken";

export function ConfigValueFilters({ value, onChange }: Props) {
  const intl = useIntl();
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[220px] flex-1">
        <label
          htmlFor="config-search"
          className="mb-1 block text-xs uppercase tracking-[0.14em] text-foreground-subtle"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {intl.formatMessage({ id: "config.search.label" })}
        </label>
        <input
          id="config-search"
          type="search"
          value={value.key_prefix}
          onChange={(e) => onChange({ key_prefix: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Escape") onChange({ key_prefix: "" });
          }}
          placeholder={intl.formatMessage({ id: "config.search.placeholder" })}
          className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-subtle"
          style={{ fontFamily: "var(--font-mono)" }}
        />
      </div>

      <div>
        <label
          htmlFor="config-domain"
          className="mb-1 block text-xs uppercase tracking-[0.14em] text-foreground-subtle"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {intl.formatMessage({ id: "config.filter.domain.label" })}
        </label>
        <select
          id="config-domain"
          value={value.domain}
          onChange={(e) => onChange({ domain: e.target.value })}
          className={selectClass}
        >
          <option value="all">
            {intl.formatMessage({ id: "config.filter.domain.all" })}
          </option>
          {DOMAINS.map((d) => (
            <option key={d} value={d}>
              {intl.formatMessage({ id: `config.filter.domain.${d}` })}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="config-jurisdiction"
          className="mb-1 block text-xs uppercase tracking-[0.14em] text-foreground-subtle"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {intl.formatMessage({ id: "config.filter.jurisdiction.label" })}
        </label>
        <select
          id="config-jurisdiction"
          value={value.jurisdiction_id}
          onChange={(e) => onChange({ jurisdiction_id: e.target.value })}
          className={selectClass}
        >
          <option value="all">
            {intl.formatMessage({ id: "config.filter.jurisdiction.all" })}
          </option>
          <option value="global">
            {intl.formatMessage({ id: "config.filter.jurisdiction.global" })}
          </option>
          {JURISDICTIONS.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="config-language"
          className="mb-1 block text-xs uppercase tracking-[0.14em] text-foreground-subtle"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {intl.formatMessage({ id: "config.filter.language.label" })}
        </label>
        <select
          id="config-language"
          value={value.language}
          onChange={(e) => onChange({ language: e.target.value })}
          className={selectClass}
        >
          <option value="all">
            {intl.formatMessage({ id: "config.filter.language.all" })}
          </option>
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}