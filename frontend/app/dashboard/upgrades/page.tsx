"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { PostRequestAxios, PatchRequestAxios } from "@/api-hooks/api-hooks";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
type Case = {
  id: string;
  userId: string;
  targetId?: string;
  kind: string;
  status: string;
  message: string;
  transactionReference?: string;
  adminNotes?: string;
};
type Audit = {
  _id: string;
  actor: string;
  action: string;
  target: string;
  reason: string;
  createdAt: string;
};
const transitions: Record<string, string[]> = {
  pending: ["contacted", "rejected"],
  contacted: ["payment_pending", "approved", "rejected"],
  payment_pending: ["paid", "rejected"],
  paid: ["active", "refunded"],
  active: ["completed", "refunded", "rejected"],
};
export default function Upgrades() {
  const queryClient = useQueryClient();
  const { data: payments, refetch: refreshPayments } = useQueryWrapper<
    {
      id: string;
      status: string;
      userId: string;
      quantity: number;
      amount: number;
      transactionId?: string;
    }[]
  >(["admin-payments"], "/platform/admin/payments");
  const { data: stats } = useQueryWrapper<Record<string, number>>(
    ["upgrade-stats"],
    "/platform/admin/summary",
  );
  const { data: cases, refetch } = useQueryWrapper<Case[]>(
    ["admin-service-cases"],
    "/platform/admin/cases",
  );
  const { data: settings } = useQueryWrapper<Record<string, string | boolean>>(
    ["platform-settings"],
    "/platform/admin/settings",
  );
  const { data: audit, refetch: refreshAudit } = useQueryWrapper<Audit[]>(
    ["platform-audit"],
    "/platform/admin/audit",
  );
  const [edit, setEdit] = useState<Record<string, string | boolean> | null>(
      null,
    ),
    [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState(""),
    [amount, setAmount] = useState(""),
    [reason, setReason] = useState(""),
    [reminder, setReminder] = useState(""),
    [channel, setChannel] = useState("email");
  const [connectionData, setConnectionData] = useState<unknown>(null);
  const [minScore, setMinScore] = useState("1");
  const [weights, setWeights] = useState<Record<string, number>>({
    district: 1,
    maritalStatus: 1,
    profession: 1,
    education: 1,
    age: 1,
  });
  const [orderId, setOrderId] = useState(""),
    [refundReference, setRefundReference] = useState("");
  useEffect(() => {
    if (settings) {
      const saved = settings as unknown as {
        matchWeights?: Record<string, number>;
        minMatchScore?: number;
      };
      if (saved.matchWeights) setWeights(saved.matchWeights);
      if (saved.minMatchScore !== undefined)
        setMinScore(String(saved.minMatchScore));
    }
  }, [settings]);
  const current = edit || settings || {};
  const update = async (c: Case, status: string) => {
    const reason = window.prompt("Reason for this action");
    if (!reason) return;
    const transactionReference = ["paid", "refunded"].includes(status)
      ? window.prompt("Verified payment reference")
      : undefined;
    const adminNotes =
      window.prompt("Follow-up notes", c.adminNotes || "") || c.adminNotes;
    if (!window.confirm("Confirm " + c.kind + " → " + status + "?")) return;
    setBusy(true);
    const [data, error] = await PatchRequestAxios(
      "/platform/admin/cases/" + c.id,
      { status, reason, transactionReference, adminNotes },
    );
    setBusy(false);
    if (data) {
      toast.success("Status updated");
      refetch();
      refreshAudit();
    } else toast.error(error?.message || "Unable to update");
  };
  const run = async (url: string, payload: Record<string, unknown>) => {
    setBusy(true);
    try {
      const [data, error] = await PostRequestAxios(url, payload);
      if (data) {
        toast.success("Saved");
        refetch();
        refreshAudit();
      } else toast.error(error?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold">Service & Connection Management</h1>
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {Object.entries(stats || {}).map(([k, v]) => (
          <Card key={k}>
            <CardHeader>
              <CardTitle className="text-sm">{k}</CardTitle>
            </CardHeader>
            <CardContent>{v}</CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            Applications, deletion requests, reports & support
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {cases?.map((c) => (
            <div key={c.id} className="rounded border p-4 flex flex-col gap-3">
              <div className="flex gap-3">
                <Badge>{c.kind}</Badge>
                <Badge variant="secondary">{c.status}</Badge>
              </div>
              <p className="text-sm">
                User: {c.userId} {c.targetId && " · Profile: " + c.targetId}
              </p>
              <p className="whitespace-pre-wrap">{c.message}</p>
              {c.transactionReference && (
                <p>Payment reference: {c.transactionReference}</p>
              )}
              {c.adminNotes && (
                <p className="text-sm text-muted-foreground">{c.adminNotes}</p>
              )}
              <div className="flex gap-2 flex-wrap">
                {(transitions[c.status] || []).map((status) => (
                  <Button
                    key={status}
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => update(c, status)}
                  >
                    {status}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const adminNotes = window.prompt(
                    "Follow-up notes",
                    c.adminNotes || "",
                  );
                  const assignedTo = window.prompt("Assigned team member", "");
                  if (adminNotes !== null) {
                    const [data, error] = await PatchRequestAxios(
                      "/platform/admin/cases/" + c.id,
                      { adminNotes, assignedTo },
                    );
                    if (data) {
                      toast.success("Notes saved");
                      refetch();
                    } else toast.error(error?.message || "Unable to save");
                  }
                }}
              >
                Notes / Assignment
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Connection payment review</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {payments?.map((p) => (
            <div key={p.id} className="rounded border p-3 text-sm">
              <p>
                Order: {p.id} · User: {p.userId}
              </p>
              <p>
                {p.quantity} connections · ৳{p.amount} · {p.status} ·{" "}
                {p.transactionId}
              </p>
              {p.status === "pending_manual" && (
                <Button
                  disabled={busy}
                  onClick={async () => {
                    const reason = window.prompt(
                      "Payment verification reason / evidence",
                    );
                    if (
                      reason &&
                      window.confirm(
                        "Confirm amount, currency and transaction reference have been verified?",
                      )
                    ) {
                      await run(
                        "/platform/admin/verify-manual-payment/" + p.id,
                        { confirm: true, reason },
                      );
                      refreshPayments();
                    }
                  }}
                >
                  Verify manual payment
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>User connections & reminders</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel>User ID</FieldLabel>
              <Input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="MongoDB user ID"
              />
            </Field>
            <Button
              variant="outline"
              onClick={async () => {
                const { GetRequestNormal } =
                  await import("@/api-hooks/api-hooks");
                try {
                  setConnectionData(
                    await GetRequestNormal(
                      "/platform/admin/connections/" + userId,
                    ),
                  );
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : "Unable to load",
                  );
                }
              }}
            >
              View balance & history
            </Button>
            {connectionData !== null && (
              <pre className="max-h-96 overflow-auto text-xs rounded border p-3">
                {JSON.stringify(connectionData, null, 2)}
              </pre>
            )}
            <Field>
              <FieldLabel>Grant connections</FieldLabel>
              <Input
                type="number"
                min={1}
                max={10000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Adjustment reason</FieldLabel>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
            <Button
              disabled={busy || !userId || !amount || !reason}
              onClick={() => {
                if (window.confirm("Grant " + amount + " connections?"))
                  void run("/platform/admin/adjust-connections/" + userId, {
                    amount: Number(amount),
                    reason,
                    requestId: crypto.randomUUID(),
                  });
              }}
            >
              Confirm grant
            </Button>
            <Field>
              <FieldLabel>Reminder message (optional)</FieldLabel>
              <Textarea
                value={reminder}
                onChange={(e) => setReminder(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Reminder channel</FieldLabel>
              <select
                aria-label="Reminder channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="rounded border p-2"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </Field>
            <Button
              disabled={busy || !userId}
              onClick={() => {
                if (window.confirm("Send this reminder to the selected user?"))
                  void run("/platform/admin/remind/" + userId, {
                    message: reminder,
                    channel,
                  });
              }}
            >
              Send reminder
            </Button>
          </FieldGroup>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Matching criteria</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel>Minimum matching score (%)</FieldLabel>
              <Input
                type="number"
                min={0}
                max={100}
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
              />
            </Field>
            {Object.keys(weights).map((k) => (
              <Field key={k}>
                <FieldLabel>{k} weight</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={weights[k]}
                  onChange={(e) =>
                    setWeights({ ...weights, [k]: Number(e.target.value) })
                  }
                />
              </Field>
            ))}
            <Button
              onClick={async () => {
                const [data, error] = await PatchRequestAxios(
                  "/platform/admin/settings",
                  { matchWeights: weights, minMatchScore: Number(minScore) },
                );
                if (data) toast.success("Matching criteria saved");
                else toast.error(error?.message || "Unable to save");
              }}
            >
              Save matching criteria
            </Button>
          </FieldGroup>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Record verified payment reversal</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel>Order ID</FieldLabel>
              <Input
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Verified reversal transaction reference</FieldLabel>
              <Input
                value={refundReference}
                onChange={(e) => setRefundReference(e.target.value)}
              />
            </Field>
            <p className="text-sm text-muted-foreground">
              This records a completed money reversal. Unused credits and linked
              unlock permissions are revoked. It does not send a gateway refund.
            </p>
            <Button
              variant="destructive"
              disabled={busy || !orderId || !refundReference || !reason}
              onClick={() => {
                if (
                  window.confirm(
                    "Confirm the money has been reversed and revoke the related access?",
                  )
                )
                  void run("/platform/admin/refund/" + orderId, {
                    reason,
                    transactionReference: refundReference,
                    confirmMoneyReversed: true,
                  });
              }}
            >
              Confirm reversal
            </Button>
          </FieldGroup>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Messenger, discovery & approved policies</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel>Official Messenger URL</FieldLabel>
              <Input
                value={String(current.messengerUrl || "")}
                placeholder="https://m.me/official-page"
                onChange={(e) =>
                  setEdit({ ...current, messengerUrl: e.target.value })
                }
              />
            </Field>
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={current.discoveryEnabled === true}
                onChange={(e) =>
                  setEdit({ ...current, discoveryEnabled: e.target.checked })
                }
              />
              Show popular & recent profiles on the landing page
            </label>
            {["terms", "privacy", "refund"].map((k) => (
              <Field key={k}>
                <FieldLabel>{k} policy</FieldLabel>
                <Textarea
                  rows={8}
                  value={String(current[k] || "")}
                  onChange={(e) => setEdit({ ...current, [k]: e.target.value })}
                />
                <label className="flex gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={current[k + "Published"] === true}
                    onChange={(e) =>
                      setEdit({
                        ...current,
                        [k + "Published"]: e.target.checked,
                      })
                    }
                  />
                  Client approved — publish this policy
                </label>
              </Field>
            ))}
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const [data, error] = await PatchRequestAxios(
                  "/platform/admin/settings",
                  current,
                );
                setBusy(false);
                if (data) {
                  toast.success("Settings saved");
                  void queryClient.invalidateQueries({
                    queryKey: ["public-settings"],
                  });
                  void queryClient.invalidateQueries({
                    queryKey: ["messenger-settings"],
                  });
                } else toast.error(error?.message || "Unable to save");
              }}
            >
              Save settings
            </Button>
          </FieldGroup>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Audit history</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto max-h-96">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {audit?.map((a) => (
                <tr key={a._id} className="border-b">
                  <td className="p-2">
                    {new Date(a.createdAt).toLocaleString()}
                  </td>
                  <td>{a.actor}</td>
                  <td>{a.action}</td>
                  <td>{a.target}</td>
                  <td>{a.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
