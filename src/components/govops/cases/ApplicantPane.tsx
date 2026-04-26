import { FormattedDate, useIntl } from "react-intl";
import { ProvenanceRibbon } from "@/components/govops/ProvenanceRibbon";
import type { CaseBundle } from "@/lib/types";

export function ApplicantPane({ bundle }: { bundle: CaseBundle }) {
  const intl = useIntl();
  const { applicant, residency_periods, evidence_items } = bundle;
  return (
    <section
      aria-labelledby="applicant-heading"
      className="flex items-stretch rounded-md border border-border bg-surface-raised"
    >
      <ProvenanceRibbon variant="human" />
      <div className="flex-1 space-y-6 p-5">
        <header className="space-y-1">
          <p
            className="text-[10px] uppercase tracking-[0.18em] text-foreground-subtle"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {intl.formatMessage({ id: "cases.applicant.heading" })}
          </p>
          <h2
            id="applicant-heading"
            className="text-xl text-foreground"
            style={{ fontFamily: "var(--font-serif)", fontWeight: 600 }}
          >
            {applicant.legal_name}
          </h2>
          <dl
            className="grid grid-cols-1 gap-x-6 gap-y-1 pt-2 text-xs sm:grid-cols-2"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            <div>
              <dt className="inline text-foreground-subtle">
                {intl.formatMessage({ id: "cases.applicant.dob" })}:{" "}
              </dt>
              <dd className="inline text-foreground">
                <FormattedDate value={applicant.date_of_birth} dateStyle="medium" />
              </dd>
            </div>
            <div>
              <dt className="inline text-foreground-subtle">
                {intl.formatMessage({ id: "cases.applicant.legal_status" })}:{" "}
              </dt>
              <dd className="inline text-foreground">{applicant.legal_status}</dd>
            </div>
            <div>
              <dt className="inline text-foreground-subtle">
                {intl.formatMessage({ id: "cases.applicant.country_of_birth" })}:{" "}
              </dt>
              <dd className="inline text-foreground">{applicant.country_of_birth}</dd>
            </div>
          </dl>
        </header>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">
            {intl.formatMessage({ id: "cases.residency.heading" })}
          </h3>
          <ul className="space-y-2">
            {residency_periods.map((p, i) => (
              <li
                key={i}
                className="flex items-baseline gap-3 rounded-sm border border-border bg-surface px-3 py-2 text-sm"
              >
                <span
                  className="inline-flex items-center rounded-sm border border-border bg-surface-sunken px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-foreground-muted"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {p.country}
                </span>
                <span className="text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                  <FormattedDate value={p.start_date} dateStyle="medium" />
                  {" – "}
                  {p.end_date ? (
                    <FormattedDate value={p.end_date} dateStyle="medium" />
                  ) : (
                    intl.formatMessage({ id: "cases.residency.ongoing" })
                  )}
                </span>
                <span
                  className={`ms-auto text-xs ${
                    p.verified ? "text-verdict-enacted" : "text-foreground-muted"
                  }`}
                >
                  {p.verified
                    ? `✓ ${intl.formatMessage({ id: "cases.residency.verified" })}`
                    : intl.formatMessage({ id: "cases.residency.unverified" })}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">
            {intl.formatMessage({ id: "cases.evidence.heading" })}
          </h3>
          {evidence_items.length === 0 ? (
            <p className="text-sm text-foreground-muted">
              {intl.formatMessage({ id: "cases.evidence.empty" })}
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead
                className="border-b border-border text-[10px] uppercase tracking-[0.14em] text-foreground-subtle"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                <tr>
                  <th className="py-2 pe-3 font-normal">
                    {intl.formatMessage({ id: "cases.evidence.column.type" })}
                  </th>
                  <th className="py-2 pe-3 font-normal">
                    {intl.formatMessage({ id: "cases.evidence.column.description" })}
                  </th>
                  <th className="py-2 pe-3 font-normal">
                    {intl.formatMessage({ id: "cases.evidence.column.provided" })}
                  </th>
                  <th className="py-2 font-normal">
                    {intl.formatMessage({ id: "cases.evidence.column.verified" })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {evidence_items.map((e) => (
                  <tr key={e.id} className="border-b border-border/60 last:border-0">
                    <td
                      className="py-2 pe-3 align-top text-foreground"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {e.evidence_type}
                    </td>
                    <td className="py-2 pe-3 align-top text-foreground">{e.description}</td>
                    <td className="py-2 pe-3 align-top text-xs">
                      {e.provided ? "✓" : "—"}
                    </td>
                    <td className="py-2 align-top text-xs">{e.verified ? "✓" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}