"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PhoneNumberInputProps = {
  value?: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  defaultCountry?: string;
  onValidityChange?: (valid: boolean) => void;
};

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
const countries = getCountries()
  .map((country) => ({
    country,
    name: countryNames.of(country) || country,
    callingCode: getCountryCallingCode(country),
  }))
  .sort((a, b) =>
    a.country === "BD"
      ? -1
      : b.country === "BD"
        ? 1
        : a.name.localeCompare(b.name),
  );

const toAsciiDigits = (value: string) =>
  value
    .replace(/[০-৯]/g, (digit) => String("০১২৩৪৫৬৭৮৯".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));

export function normalizeInternationalPhone(
  value: string,
  country: string,
): string | null {
  const raw = toAsciiDigits(value).trim();
  if (!raw) return "";
  const parsed = parsePhoneNumberFromString(raw, country as CountryCode);
  return parsed?.isValid() ? parsed.number : null;
}

export default function PhoneNumberInput({
  value = "",
  onChange,
  id = "phone-number",
  placeholder = "মোবাইল নম্বর লিখুন",
  disabled = false,
  required = false,
  className = "",
  defaultCountry = "BD",
  onValidityChange,
}: PhoneNumberInputProps) {
  const [country, setCountry] = useState(defaultCountry);
  const [national, setNational] = useState("");
  const [touched, setTouched] = useState(false);
  const lastEmitted = useRef<string | null>(null);

  useEffect(() => {
    if (lastEmitted.current === value) {
      lastEmitted.current = null;
      return;
    }
    const raw = toAsciiDigits(value || "").trim();
    if (!raw) {
      setNational("");
      return;
    }
    const parsed = parsePhoneNumberFromString(raw);
    if (parsed) {
      const selected =
        parsed.country && getCountries().includes(parsed.country)
          ? parsed.country
          : defaultCountry;
      setCountry(selected);
      setNational(parsed.nationalNumber);
    } else {
      setNational(raw.replace(/\D/g, ""));
    }
    // Only sync when the external value changes (e.g. loading an existing profile).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const normalized = useMemo(
    () => normalizeInternationalPhone(national, country),
    [national, country],
  );
  const hasInput = national.trim().length > 0;
  const valid = !!normalized && normalized.length > 0;
  const invalid = hasInput && !valid;

  useEffect(() => {
    onValidityChange?.(!required && !hasInput ? true : valid);
  }, [valid, hasInput, required, onValidityChange]);

  const updateNational = (next: string) => {
    const clean = toAsciiDigits(next)
      .replace(/[^\d\s()-]/g, "")
      .slice(0, 22);
    setNational(clean);
    setTouched(true);
    const result = normalizeInternationalPhone(clean, country);
    const emitted = result || clean;
    lastEmitted.current = emitted;
    onChange(emitted);
  };

  const updateCountry = (next: string) => {
    setCountry(next);
    setTouched(true);
    const result = normalizeInternationalPhone(national, next);
    const emitted = result || national;
    lastEmitted.current = emitted;
    onChange(emitted);
  };

  const countryOption = countries.find((entry) => entry.country === country);

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div
        className={`flex min-w-0 overflow-hidden rounded-lg border bg-background focus-within:ring-2 focus-within:ring-pink-200 ${invalid && touched ? "border-red-500 focus-within:ring-red-100" : "border-input"}`}
      >
        <Select
          value={country}
          onValueChange={updateCountry}
          disabled={disabled}
        >
          <SelectTrigger
            aria-label="Country calling code"
            className="h-11 w-[118px] shrink-0 rounded-none border-0 border-r bg-muted/40 px-2 text-sm shadow-none focus:ring-0"
          >
            <SelectValue>
              <span className="font-semibold">
                +{countryOption?.callingCode || "880"}
              </span>
              <span className="ml-1 text-xs text-muted-foreground">
                {country}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {countries.map((entry) => (
              <SelectItem key={entry.country} value={entry.country}>
                {entry.name} (+{entry.callingCode})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          enterKeyHint="done"
          value={national}
          onChange={(event) => updateNational(event.target.value)}
          onBlur={() => setTouched(true)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-invalid={invalid && touched}
          className="h-11 min-w-0 flex-1 rounded-none border-0 px-3 shadow-none focus-visible:ring-0"
        />
      </div>
      {invalid && touched ? (
        <p className="text-xs font-medium text-red-600" role="alert">
          সঠিক মোবাইল নম্বর লিখুন। নির্বাচিত দেশের কান্ট্রি কোড ও নম্বর মিলিয়ে দেখুন।
        </p>
      ) : hasInput && valid ? (
        <p className="text-xs font-medium text-emerald-700">✓ সঠিক নম্বর</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          বাংলাদেশের কান্ট্রি কোড +880 আগে থেকেই নির্বাচিত। প্রয়োজনে দেশ পরিবর্তন
          করুন।
        </p>
      )}
    </div>
  );
}
