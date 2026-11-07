import { premiumIsActive } from './premium-service';

type RecommendationRecipient = {
  _id: unknown;
  phoneNumber?: string | null;
  isSubscriber?: boolean;
  premiumService?: { expiresAt?: Date | string } | null;
  isNew: boolean;
};

/** Notify only on a NEW recommendation and only to active, local SMS-enabled subscribers. */
export function premiumRecommendationSmsTargets(
  recipients: readonly RecommendationRecipient[],
): { id: string; number: string }[] {
  return recipients.flatMap(recipient => {
    if (!recipient.isNew || !premiumIsActive({...recipient,premiumService:recipient.premiumService ?? undefined})) return [];
    const number = String(recipient.phoneNumber || '').replace(/[\s()-]/g, '');
    if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(number)) return [];
    return [{ id: String(recipient._id), number }];
  });
}
