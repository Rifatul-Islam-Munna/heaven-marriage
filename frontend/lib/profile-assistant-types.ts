import type { UIMessage } from "ai";
export type ProfileProgress = {
  enabled: boolean;
  revision: number;
  done: boolean;
  currentField: {
    path: string;
    label: string;
    question: string;
    options?: { value: string; label: string }[];
  } | null;
  completion: { percentage: number; remaining: string[]; nextStep: number };
  changed?: {
    path: string;
    label: string;
    value: string | number | boolean;
  } | null;
};
export type ProfileChatMessage = UIMessage<
  unknown,
  { profile: ProfileProgress }
>;
export type ProfileSession = ProfileProgress & {
  messages: ProfileChatMessage[];
  message?: ProfileChatMessage;
};
