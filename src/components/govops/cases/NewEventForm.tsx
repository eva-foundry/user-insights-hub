import { useState } from "react";
import { useIntl } from "react-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { postCaseEvent } from "@/lib/api";
import type {
  CaseEventRequest,
  CaseEventType,
  PostEventResponse,
} from "@/lib/types";

export interface NewEventFormProps {
  caseId: string;
  onCreated: (response: PostEventResponse) => void;
}

const ISO_COUNTRIES = ["CA", "US", "BR", "FR", "DE", "ES", "UK", "UA", "MX", "AU"];

export function NewEventForm({ caseId, onCreated }: NewEventFormProps) {
  const intl = useIntl();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [eventType, setEventType] = useState<CaseEventType>("re_evaluate");
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [note, setNote] = useState("");
  // type-specific
  const [toCountry, setToCountry] = useState("");
  const [fromCountry, setFromCountry] = useState("");
  const [openNew, setOpenNew] = useState(true);
  const [toStatus, setToStatus] = useState("citizen");
  const [evidenceType, setEvidenceType] = useState("");
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [evidenceVerified, setEvidenceVerified] = useState(false);

  const reset = () => {
    setEventType("re_evaluate");
    setEffectiveDate(new Date().toISOString().slice(0, 10));
    setNote("");
    setToCountry("");
    setFromCountry("");
    setOpenNew(true);
    setToStatus("citizen");
    setEvidenceType("");
    setEvidenceDescription("");
    setEvidenceVerified(false);
  };

  const buildPayload = (): Record<string, unknown> => {
    switch (eventType) {
      case "move_country":
        return {
          to_country: toCountry,
          ...(fromCountry ? { from_country: fromCountry } : {}),
          open_new: openNew,
        };
      case "change_legal_status":
        return { to_status: toStatus };
      case "add_evidence":
        return {
          evidence_type: evidenceType,
          ...(evidenceDescription ? { description: evidenceDescription } : {}),
          verified: evidenceVerified,
        };
      case "re_evaluate":
      default:
        return {};
    }
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const body: CaseEventRequest = {
      event_type: eventType,
      effective_date: effectiveDate,
      payload: buildPayload(),
      note: note || undefined,
    };
    setSubmitting(true);
    try {
      const res = await postCaseEvent(caseId, body, true);
      onCreated(res);
      setOpen(false);
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record event");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && setOpen(o)}>
      <DialogTrigger asChild>
        <Button variant="outline" type="button">
          {intl.formatMessage({ id: "events.form.record_button" })}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {intl.formatMessage({ id: "events.form.heading" })}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {intl.formatMessage({ id: "events.form.heading" })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="evt-type">
              {intl.formatMessage({ id: "events.form.field.event_type" })}
            </Label>
            <Select
              value={eventType}
              onValueChange={(v) => setEventType(v as CaseEventType)}
            >
              <SelectTrigger id="evt-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="re_evaluate">
                  {intl.formatMessage({ id: "events.type.re_evaluate" })}
                </SelectItem>
                <SelectItem value="move_country">
                  {intl.formatMessage({ id: "events.type.move_country" })}
                </SelectItem>
                <SelectItem value="change_legal_status">
                  {intl.formatMessage({ id: "events.type.change_legal_status" })}
                </SelectItem>
                <SelectItem value="add_evidence">
                  {intl.formatMessage({ id: "events.type.add_evidence" })}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="evt-date">
              {intl.formatMessage({ id: "events.form.field.effective_date" })}
            </Label>
            <Input
              id="evt-date"
              type="date"
              required
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </div>

          {eventType === "move_country" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="evt-from">
                    {intl.formatMessage({ id: "events.form.field.from_country" })}
                  </Label>
                  <Select value={fromCountry} onValueChange={setFromCountry}>
                    <SelectTrigger id="evt-from">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {ISO_COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="evt-to">
                    {intl.formatMessage({ id: "events.form.field.to_country" })}
                  </Label>
                  <Select value={toCountry} onValueChange={setToCountry}>
                    <SelectTrigger id="evt-to">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {ISO_COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={openNew}
                  onCheckedChange={(v) => setOpenNew(v === true)}
                />
                {intl.formatMessage({ id: "events.form.field.open_new" })}
              </label>
            </>
          )}

          {eventType === "change_legal_status" && (
            <div className="space-y-2">
              <Label htmlFor="evt-status">
                {intl.formatMessage({ id: "events.form.field.to_status" })}
              </Label>
              <Select value={toStatus} onValueChange={setToStatus}>
                <SelectTrigger id="evt-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="citizen">citizen</SelectItem>
                  <SelectItem value="permanent_resident">permanent_resident</SelectItem>
                  <SelectItem value="other">other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {eventType === "add_evidence" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="evt-evtype">
                  {intl.formatMessage({ id: "events.form.field.evidence_type" })}
                </Label>
                <Input
                  id="evt-evtype"
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="evt-evdesc">
                  {intl.formatMessage({ id: "events.form.field.description" })}
                </Label>
                <Input
                  id="evt-evdesc"
                  value={evidenceDescription}
                  onChange={(e) => setEvidenceDescription(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={evidenceVerified}
                  onCheckedChange={(v) => setEvidenceVerified(v === true)}
                />
                {intl.formatMessage({ id: "events.form.field.verified" })}
              </label>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="evt-note">
              {intl.formatMessage({ id: "events.form.field.note" })}
            </Label>
            <Textarea
              id="evt-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              {intl.formatMessage({ id: "events.form.cancel" })}
            </Button>
            <Button type="submit" disabled={submitting}>
              {intl.formatMessage({ id: "events.form.submit" })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
