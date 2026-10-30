"use client";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";
export default function VerifyContact() {
  const [contact, setContact] = useState(""),
    [password, setPassword] = useState(""),
    [challengeId, setChallengeId] = useState(""),
    [otp, setOtp] = useState("");
  const request = useCommonMutationApi({
    url: "/platform/contact-change",
    method: "POST",
    successMessage: "Verification code sent",
    onSuccess: (d) => setChallengeId(d.challengeId),
  });
  const verify = useCommonMutationApi({
    url: "/platform/contact-verify",
    method: "POST",
    successMessage: "Verified contact updated",
    onSuccess: () => {
      setChallengeId("");
      setPassword("");
      setOtp("");
    },
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify or change phone / email</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel>Phone (+country code) or email</FieldLabel>
            <Input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>Current password (password accounts)</FieldLabel>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Button
            disabled={!contact || request.isPending}
            onClick={() => request.mutate({ contact, password })}
          >
            Send verification code
          </Button>
          {challengeId && (
            <>
              <Field>
                <FieldLabel>OTP</FieldLabel>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </Field>
              <Button
                disabled={otp.length !== 6 || verify.isPending}
                onClick={() => verify.mutate({ challengeId, otp })}
              >
                Verify & update
              </Button>
            </>
          )}
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
