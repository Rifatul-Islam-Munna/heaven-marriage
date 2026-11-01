/** "অথবা" separator between the Google button and the phone/email form. */
export default function AuthDivider({ label }: { label: string }) {
  return (
    <div className="my-5 flex items-center gap-3" role="separator" aria-label={label}>
      <span className="h-px flex-1 bg-pink-100" />
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <span className="h-px flex-1 bg-pink-100" />
    </div>
  );
}
