// components/marriage-benefits-section.tsx
import { CheckCircle2, BookOpen } from "lucide-react";

const benefits = [
  "সমাজে নারীদের জন্য নিরাপদ ও রেঁধ জীবনসঙ্গী ব্যবস্থা নিশ্চিত করা",
  "জিনাহ ও অশ্লীল সম্পর্কে থেকে সমাজকে রক্ষা করা",
  "উম্মতের বংশ বৃদ্ধি ও শক্তিশালী করা",
  "বিধবা ও তালাকপ্রাপ্ত নারীদের জন্য পুনরায় বিবাহের সুযোগ তৈরি করা",
  "সংসার জীবনে আর্থিক সুখ, শান্তি ও বরকত নিশ্চিত করা",
];

export default function MarriageBenefitsSection() {
  return (
    <section className="w-full border-y bg-background py-12 md:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Badge */}
        <div className="mx-auto mb-10 max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 text-pink-600">
            <BookOpen className="h-5 w-5" />
            <span className="text-sm font-medium ">
              অধিক বিবাহের উপকারিতা ও ফজিলত:
            </span>
          </div>

          <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl md:text-5xl leading-tight">
            অধিক বিবাহের উপকারিতা
          </h2>
        </div>

        {/* Benefits Grid */}
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="group relative overflow-hidden border-l-2 border-pink-500/30 bg-card/50 p-5 transition-all hover:border-pink-500"
            >
              {/* Fill-up Background Animation */}
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-pink-50/50 to-purple-50/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <div className="flex gap-3">
                {/* Check Circle Icon */}
                <div className="flex-shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-500/10 transition-colors group-hover:bg-pink-500">
                    <CheckCircle2 className="h-5 w-5 text-pink-600 transition-colors group-hover:text-white" />
                  </div>
                </div>

                {/* Benefit Text */}
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {benefit}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
