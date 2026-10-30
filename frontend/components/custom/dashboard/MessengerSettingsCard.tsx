"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FaFacebookMessenger } from "react-icons/fa";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FieldGroup,
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";
import { normalizeMessengerUrl } from "@/lib/messenger-url";
export default function MessengerSettingsCard() {
  const cache = useQueryClient();
  const { data, isLoading } = useQueryWrapper<{ messengerUrl?: string }>(
    ["messenger-settings"],
    "/platform/admin/settings",
  );
  const [draft, setDraft] = useState<string | null>(null);
  const raw = draft ?? data?.messengerUrl ?? "";
  const normalized = normalizeMessengerUrl(raw);
  const invalid = !!raw.trim() && !normalized;
  const save = useCommonMutationApi({
    url: "/platform/admin/settings",
    method: "PATCH",
    successMessage: "Messenger URL saved. The landing-page button is updated.",
    onSuccess: () => {
      setDraft(null);
      void Promise.all([
        cache.invalidateQueries({ queryKey: ["public-settings"] }),
        cache.invalidateQueries({ queryKey: ["platform-settings"] }),
        cache.invalidateQueries({ queryKey: ["messenger-settings"] }),
      ]);
    },
  });
  return (
    <Card className="mb-6 border-pink-100 shadow-none" id="messenger-settings">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FaFacebookMessenger aria-hidden="true" />
          Landing Page Messenger Button
        </CardTitle>
        <CardDescription>
          অফিশিয়াল Messenger URL দিন। হোমপেজের যোগাযোগ বাটন এই লিংক খুলবে।
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field data-invalid={invalid || undefined}>
            <FieldLabel htmlFor="messenger-url">
              Official Messenger URL
            </FieldLabel>
            <Input
              id="messenger-url"
              autoComplete="off"
              inputMode="url"
              value={raw}
              disabled={isLoading || save.isPending}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="https://m.me/your-page"
              aria-invalid={invalid}
              aria-describedby="messenger-url-help"
            />
            <FieldDescription id="messenger-url-help">
              m.me/PageName, messenger.com/t/PageID অথবা
              facebook.com/messages/t/PageID ব্যবহার করুন।
            </FieldDescription>
            {invalid && <FieldError>সঠিক HTTPS Messenger লিংক দিন।</FieldError>}
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              disabled={isLoading || save.isPending || invalid}
              onClick={() => save.mutate({ messengerUrl: normalized })}
            >
              {save.isPending ? "সংরক্ষণ হচ্ছে..." : "Save Messenger URL"}
            </Button>
            {normalized && (
              <Button variant="outline" asChild>
                <a href={normalized} target="_blank" rel="noopener noreferrer">
                  Open Messenger
                </a>
              </Button>
            )}
          </div>
          {!raw.trim() && (
            <p className="text-sm text-muted-foreground">
              লিংক না দিলে সাধারণ জিজ্ঞাসার জন্য সরাসরি কল বাটন থাকবে।
            </p>
          )}
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
