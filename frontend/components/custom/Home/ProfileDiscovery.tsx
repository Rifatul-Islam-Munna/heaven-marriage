"use client";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import BiodataCard from "@/components/custom/common/biodata-card";
import type { User } from "@/@types/user";
export default function ProfileDiscovery() {
  const { data } = useQueryWrapper<{ popular: User[]; recent: User[] }>(
    ["profile-discovery"],
    "/public/discovery",
  );
  if (!data?.popular.length && !data?.recent.length) return null;
  return (
    <section className="container mx-auto px-4 py-10">
      {[
        ["জনপ্রিয় বায়োডাটা", data.popular],
        ["নতুন সদস্য", data.recent],
      ].map(([title, profiles]) => (
        <div key={String(title)} className="mb-8">
          <h2 className="mb-5 text-2xl font-bold text-pink-700">
            {String(title)}
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(profiles as User[]).map((u) => (
              <BiodataCard
                key={u._id}
                id={u._id || ""}
                userId={u.userId || ""}
                biodataNumber={u.userId || ""}
                gender={u.gender === "female" ? "female" : "male"}
                age={u.age || 0}
                height={u.personalInformation?.height || ""}
                district={u.address?.district || ""}
                upazila={u.address?.upazila || ""}
                education={u.educationInfo?.highestEducation || ""}
                profession={u.occupational?.profession || ""}
                skinTone={u.personalInformation?.skinTone || ""}
                isVerified={u.isVerified}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
