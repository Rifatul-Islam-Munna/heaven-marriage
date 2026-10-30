"use server";
import { cookies } from "next/headers";
export async function extractBiodata(form: FormData) {
  const token = (await cookies()).get("access_token")?.value;
  if (!token) return { error: "Please log in" };
  const response = await fetch(process.env.BASE_URL + "/platform/ai/extract", {
    method: "POST",
    headers: { access_token: token },
    body: form,
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok)
    return {
      error:
        typeof data.message === "string"
          ? data.message
          : "Unable to process biodata",
    };
  return {
    data: data as {
      fields: { path: string; value: string | number; evidence: string }[];
      message: string;
    },
  };
}
