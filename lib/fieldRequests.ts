import { fieldRequestDecisionEmail, fieldRequestReceivedEmail } from "@/lib/email/fieldRequestEmails";

export type FieldRequestStatus =
  | "pending"
  | "payment_pending"
  | "active"
  | "suspended"
  | "rejected";

export type FieldRequest = {
  id: string;
  created_at: string;
  field_name: string;
  owner_name: string | null;
  email: string;
  phone: string;
  city: string | null;
  website: string | null;
  facebook: string | null;
  instagram: string | null;
  monthly_games: string | null;
  message: string | null;
  status: FieldRequestStatus;
  admin_notes: string | null;
  decision_message: string | null;
  reviewed_at: string | null;
};

export const FIELD_REQUEST_STATUSES: Record<
  FieldRequestStatus,
  { label: string; shortLabel: string; className: string }
> = {
  pending: {
    label: "Разглежда се",
    shortLabel: "Pending",
    className: "border-yellow-400/30 bg-yellow-400/10 text-yellow-200",
  },
  payment_pending: {
    label: "Очаква плащане",
    shortLabel: "Payment",
    className: "border-blue-400/30 bg-blue-400/10 text-blue-200",
  },
  active: {
    label: "Активен",
    shortLabel: "Active",
    className: "border-pink-400/30 bg-pink-400/10 text-pink-200",
  },
  suspended: {
    label: "Спрян",
    shortLabel: "Suspended",
    className: "border-orange-400/30 bg-orange-400/10 text-orange-200",
  },
  rejected: {
    label: "Отказан",
    shortLabel: "Rejected",
    className: "border-red-400/30 bg-red-400/10 text-red-200",
  },
};

export function getFieldRequestMessage(status: FieldRequestStatus, fieldName: string) {
  if (status === "pending") return fieldRequestReceivedEmail(fieldName).body;
  return fieldRequestDecisionEmail(status, fieldName).body;
}

export function buildMailTo(email: string, status: FieldRequestStatus, fieldName: string, body?: string | null) {
  const template =
    status === "pending"
      ? fieldRequestReceivedEmail(fieldName)
      : fieldRequestDecisionEmail(status, fieldName);

  const subject = template.subject;
  const message = body || template.body;
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
}
