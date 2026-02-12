export const marriedStatus = [
  {
    "id": 1,
    "bn": "সকল",
    "en": "all",
        "gender":"all"
  },
  {
    "id": 2,
    "bn": "অবিবাহিত",
    "en": "Unmarried",
     "gender":"all"
  },
  {
    "id": 3,
    "bn": "ডিভোর্স্ড (সন্তান আছে)",
    "en": "Divorced (With Children)",
    "gender":"male"
  },
  {
    "id": 4,
    "bn": "ডিভোর্স্ড (সন্তান নাই)",
    "en": "Divorced (No Children)",
    "gender":"male"
  },
  {
    "id": 5,
    "bn": "বিপত্নীক (সন্তান আছে)",
    "en": "Widower (With Children)",
    "gender":"male"
  },
  {
    "id": 6,
    "bn": "বিপত্নীক (সন্তান নাই)",
    "en": "Widower (No Children)",
    "gender":"male"
  },
  {
    "id": 7,
    "bn": "বিবাহিত (একজন স্ত্রী রয়েছেন)",
    "en": "Married (One Wife)",
      "gender":"male"
  },
  {
    "id": 8,
    "bn": "বিবাহিত (দুইজন স্ত্রী রয়েছেন)",
    "en": "Married (Two Wives)",
        "gender":"male"
  },
  {
    "id": 9,
    "bn": "বিবাহিত (তিনজন স্ত্রী রয়েছেন)",
    "en": "Married (Three Wives)",
        "gender":"male"
  },
  {
    "id": 100,
    "bn": "মাসনা",
    "en": "yes",
    "gender":"female"
  },
  {
  "id": 101,
  "bn": "ডিভোর্সী (সন্তান আছে)",
  "en": "Divorced (with children)",
  "gender": "female"
},
{
  "id": 102,
  "bn": "ডিভোর্সী (সন্তান নেই)",
  "en": "Divorced (without children)",
  "gender": "female"
},
{
  "id": 103,
  "bn": "বিধবা (সন্তান আছে)",
  "en": "Widow (with children)",
  "gender": "female"
},
{
  "id": 104,
  "bn": "বিধবা (সন্তান নেই)",
  "en": "Widow (without children)",
  "gender": "female"
},
{
  "id": 105,
  "bn": "বন্ধ্যা",
  "en": "Childless/Infertile",
  "gender": "female"
}





];


export const educationMediumOptions = [
  { value: "Qawmi Madrasa", label: "কওমী মাদ্রাসা পড়ুয়া" },
  { value: "Alia Madrasa", label: "আলিয়া মাদ্রাসা পড়ুয়া" },
  { value: "General education", label: "জেনারেল শিক্ষিত" },
  { value: "No formal education", label: "লেখাপড়া করা হয়নি" },
];
export const skinColorOptions = [
  { value: "very_fair", label: "উজ্জ্বল ফর্সা", gender: "both" },
  { value: "fair", label: "ফর্সা", gender: "both" },
  { value: "bright_tan_male", label: "উজ্জ্বল শ্যামলা", gender: "male" },
  { value: "tan_male", label: "শ্যামলা", gender: "male" },
  { value: "dark", label: "কালো", gender: "both" },
];
export const fiqhOptions = [
  { value: "hanafi", label: "হানাফি" },
  { value: "shafi", label: "শাফেঈ" },
  { value: "maliki", label: "মালিকি" },
  { value: "hanbali", label: "হাম্বলি" },
];

export const religiousEducationOptions = [
  { value: "hafez", label: "হাফেজ/হাফেজা" },
  { value: "alim", label: "আলিম/আলিমা" },
  { value: "mufti", label: "মুফতি" },
  { value: "qari", label: "কারী" },
  { value: "dawah", label: "দাঈ" },
];
export const economicStatusOptions = [
  { value: "upper", label: "উচ্চবিত্ত", gender: "both" },
  { value: "upper_middle", label: "উচ্চ-মধ্যবিত্ত", gender: "both" },
  { value: "middle", label: "মধ্যবিত্ত", gender: "both" },
  { value: "lower_middle", label: "নিম্ন-মধ্যবিত্ত", gender: "both" },
  { value: "lower", label: "নিম্নবিত্ত", gender: "both" },
];
export const professionOptions = [
  { value: "doctor", label: "ডাক্তার" },
  { value: "engineer", label: "ইঞ্জিনিয়ার" },
  { value: "teacher", label: "শিক্ষক" },
  { value: "businessman", label: "ব্যবসায়ী" },
  { value: "govt-job", label: "সরকারি চাকরি" },
  { value: "private-job", label: "বেসরকারি চাকরি" },
  { value: "student", label: "ছাত্র/ছাত্রী" },
  { value: "housewife", label: "গৃহিণী" },
  // --- New additions from the image ---
  { value: "business", label: "ব্যবসা" },
  { value: "job", label: "চাকরি" },
  { value: "agriculture", label: "কৃষি" },
  { value: "expatriate", label: "প্রবাস" },
  { value: "freelance", label: "ফ্রিল্যান্স" },
  { value: "technical", label: "কারিগরি" },
  { value: "no-income", label: "আয় নেই" },
];


export const educationOptions = [
  // --- Male Options ---
  { bangla: "মুফতি", english: "Mufti", gender: "male", type: "Religious" },
  { bangla: "মুফাসসির", english: "Mufassir", gender: "male", type: "Religious" },
  { bangla: "শায়খুল হাদিস", english: "Shaykh al-Hadith", gender: "male", type: "Religious" },
  { bangla: "আলেম", english: "Alim", gender: "male", type: "Religious" },
  { bangla: "হাফেজ", english: "Hafez", gender: "male", type: "Religious" },
  { bangla: "আত্মশিক্ষিত", english: "Self-educated", gender: "male", type: "General" },

  // --- Female Options ---
  { bangla: "মুফতিয়া", english: "Muftiya", gender: "female", type: "Religious" },
  { bangla: "মুফাসসিরা", english: "Mufassira", gender: "female", type: "Religious" },
  { bangla: "শায়খাতুল হাদিস", english: "Shaykhatul Hadith", gender: "female", type: "Religious" },
  { bangla: "আলেমা", english: "Alima", gender: "female", type: "Religious" },
  { bangla: "হাফেজা", english: "Hafeza", gender: "female", type: "Religious" },
  { bangla: "আত্মশিক্ষিতা", english: "Self-educated", gender: "female", type: "General" },

  // --- Gender Neutral Options (Applicable to both) ---
  { bangla: "মাস্টার্স", english: "Masters", gender: "both", type: "General" },
  { bangla: "অনার্স", english: "Honours", gender: "both", type: "General" },
  { bangla: "এইচ এস সি", english: "HSC", gender: "both", type: "General" },
  { bangla: "এস এস সি", english: "SSC", gender: "both", type: "General" },
  { bangla: "অষ্টম পাস", english: "Class 8 Pass", gender: "both", type: "General" }
];

export const countries = [
  {
    "id": 1,
    "bn": "বাংলাদেশ",
    "en": "Bangladesh"
  },
  // Middle East Countries
  {
    "id": 2,
    "bn": "সৌদি আরব",
    "en": "Saudi Arabia"
  },
  {
    "id": 3,
    "bn": "সংযুক্ত আরব আমিরাত",
    "en": "United Arab Emirates"
  },
  {
    "id": 4,
    "bn": "কাতার",
    "en": "Qatar"
  },
  {
    "id": 5,
    "bn": "কুয়েত",
    "en": "Kuwait"
  },
  {
    "id": 6,
    "bn": "ওমান",
    "en": "Oman"
  },
  {
    "id": 7,
    "bn": "বাহরাইন",
    "en": "Bahrain"
  },
  {
    "id": 8,
    "bn": "জর্ডান",
    "en": "Jordan"
  },
  {
    "id": 9,
    "bn": "লেবানন",
    "en": "Lebanon"
  },
  {
    "id": 10,
    "bn": "তুরস্ক",
    "en": "Turkey"
  },
  // South Asian Countries
  {
    "id": 11,
    "bn": "ভারত",
    "en": "India"
  },
  {
    "id": 12,
    "bn": "পাকিস্তান",
    "en": "Pakistan"
  },
  {
    "id": 13,
    "bn": "শ্রীলংকা",
    "en": "Sri Lanka"
  },
  {
    "id": 14,
    "bn": "নেপাল",
    "en": "Nepal"
  },
  {
    "id": 15,
    "bn": "মালদ্বীপ",
    "en": "Maldives"
  },
  // Southeast Asian Countries
  {
    "id": 16,
    "bn": "মালয়েশিয়া",
    "en": "Malaysia"
  },
  {
    "id": 17,
    "bn": "সিঙ্গাপুর",
    "en": "Singapore"
  },
  {
    "id": 18,
    "bn": "থাইল্যান্ড",
    "en": "Thailand"
  },
  {
    "id": 19,
    "bn": "ইন্দোনেশিয়া",
    "en": "Indonesia"
  },
  // East Asian Countries
  {
    "id": 20,
    "bn": "চীন",
    "en": "China"
  },
  {
    "id": 21,
    "bn": "জাপান",
    "en": "Japan"
  },
  {
    "id": 22,
    "bn": "দক্ষিণ কোরিয়া",
    "en": "South Korea"
  },
  // European Countries
  {
    "id": 23,
    "bn": "যুক্তরাজ্য",
    "en": "United Kingdom"
  },
  {
    "id": 24,
    "bn": "জার্মানি",
    "en": "Germany"
  },
  {
    "id": 25,
    "bn": "ফ্রান্স",
    "en": "France"
  },
  {
    "id": 26,
    "bn": "ইতালি",
    "en": "Italy"
  },
  {
    "id": 27,
    "bn": "স্পেন",
    "en": "Spain"
  },
  // North American Countries
  {
    "id": 28,
    "bn": "যুক্তরাষ্ট্র",
    "en": "United States"
  },
  {
    "id": 29,
    "bn": "কানাডা",
    "en": "Canada"
  },
  // Oceania
  {
    "id": 30,
    "bn": "অস্ট্রেলিয়া",
    "en": "Australia"
  },
  {
    "id": 32,
    "bn": "নিউজিল্যান্ড",
    "en": "New Zealand"
  },
  {
    "id": 31,
    "bn": "অন্যান্য",
    "en": "other"
  }
];
export const polygamyConsentOptions = [
  { 
    id: 1, 
    label: "জি, ইনশা-আল্লাহ রাজি আছি।", 
    value: "yes" 
  },
  { 
    id: 2, 
    label: "আলোচনা সাপেক্ষে।", 
    value: "subject_to_discussion" 
  },
  { 
    id: 3, 
    label: "না রাজি নয়।", 
    value: "no_not_willing" 
  }
];