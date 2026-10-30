// components/office-hours-section.tsx
import { Clock, Calendar } from "lucide-react";

export default function OfficeHoursSection() {
  return (
    <section className="w-full border-t bg-pink-50/30 py-10 md:py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Title */}
          <h3 className="mb-6 font-heading text-2xl font-bold text-foreground md:text-3xl">
            অফিস টাইম
          </h3>

          {/* Office Hours Info */}
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3 text-base text-muted-foreground md:text-lg">
              <Clock className="h-5 w-5 flex-shrink-0 text-pink-600" />
              <p>শনিবার থেকে বৃহস্পতিবার: সকাল ৯টা থেকে রাত ৯টা।</p>
            </div>

            <div className="flex items-center justify-center gap-3 text-base text-muted-foreground md:text-lg">
              <Calendar className="h-5 w-5 flex-shrink-0 text-pink-600" />
              <p>শুক্রবার অফিস বন্ধ। বিশেষ প্রয়োজনে ফোনে যোগাযোগ করুন।</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
