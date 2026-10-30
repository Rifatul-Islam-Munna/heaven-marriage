import Link from "next/link";
export type PolicyBlock = { kind: string; text: string };
export type PolicyContent = {
  title?: string;
  text: string;
  blocks?: PolicyBlock[];
  sourceHash?: string;
};
export default function PolicyDocument({
  kind,
  policy,
}: {
  kind: string;
  policy: PolicyContent;
}) {
  const blocks = policy.blocks;
  const title = blocks?.find((b) => b.kind === "title");
  const subtitle = blocks?.find((b) => b.kind === "subtitle");
  const heading =
    subtitle?.text ||
    policy.title ||
    (kind === "terms"
      ? "Terms & Conditions"
      : kind === "refund"
        ? "Refund & Cancellation Policy"
        : "Privacy Policy");
  const sections =
    blocks
      ?.map((b, i) => ({ ...b, index: i }))
      .filter((b) => b.kind === "heading" || b.kind === "subheading") || [];
  const body: React.ReactNode[] = [];
  if (blocks)
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (block.kind === "title" || block.kind === "subtitle") continue;
      if (block.kind === "bullet" || block.kind === "numbered") {
        const start = i,
          items: React.ReactNode[] = [];
        do {
          items.push(
            <li key={i} data-policy-block className="whitespace-pre-wrap pl-1">
              {blocks[i].text}
            </li>,
          );
          i++;
        } while (i < blocks.length && blocks[i].kind === block.kind);
        i--;
        body.push(
          block.kind === "bullet" ? (
            <ul
              key={start}
              className="list-disc pl-6 flex flex-col gap-2 marker:text-pink-600"
            >
              {items}
            </ul>
          ) : (
            <ol key={start} className="list-decimal pl-6 flex flex-col gap-2">
              {items}
            </ol>
          ),
        );
      } else if (block.kind === "heading")
        body.push(
          <h2
            key={i}
            id={"policy-section-" + i}
            data-policy-block
            className="scroll-mt-24 pt-5 text-xl sm:text-2xl font-bold text-pink-700"
          >
            {block.text}
          </h2>,
        );
      else if (block.kind === "subheading")
        body.push(
          <h3
            key={i}
            id={"policy-section-" + i}
            data-policy-block
            className="scroll-mt-24 pt-2 text-lg font-semibold text-gray-900"
          >
            {block.text}
          </h3>,
        );
      else
        body.push(
          <p key={i} data-policy-block className="whitespace-pre-wrap">
            {block.text}
          </p>,
        );
    }
  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50/50 to-white py-10 sm:py-14 px-4">
      <div className="container mx-auto max-w-5xl">
        <header className="text-center mb-8">
          <h1
            data-policy-block={title ? true : undefined}
            className="text-3xl sm:text-4xl font-bold text-pink-700"
          >
            {title?.text || "Niqaha.com"}
          </h1>
          <p
            data-policy-block={subtitle ? true : undefined}
            className="mt-3 text-lg sm:text-xl font-semibold text-gray-800"
          >
            {heading}
          </p>
        </header>
        <nav
          aria-label="Policy pages"
          className="mb-6 flex flex-wrap justify-center gap-3 text-sm"
        >
          <Link
            href="/policies/terms"
            aria-current={kind === "terms" ? "page" : undefined}
            className="rounded-full border border-pink-200 bg-white px-5 py-2 font-semibold text-pink-700 hover:bg-pink-50"
          >
            Terms & Conditions
          </Link>
          <Link
            href="/policies/refund"
            aria-current={kind === "refund" ? "page" : undefined}
            className="rounded-full border border-pink-200 bg-white px-5 py-2 font-semibold text-pink-700 hover:bg-pink-50"
          >
            Refund & Cancellation Policy
          </Link>
        </nav>
        <article
          data-policy-document
          data-source-hash={policy.sourceHash}
          className="rounded-2xl border border-pink-100 bg-white p-5 sm:p-8 md:p-10 shadow-none text-gray-700 leading-8 [overflow-wrap:anywhere]"
        >
          {sections.length > 0 && (
            <details className="mb-7 rounded-xl border border-pink-100 bg-pink-50/40 p-4">
              <summary className="cursor-pointer font-semibold text-pink-700">
                সূচিপত্র
              </summary>
              <nav
                aria-label="Policy sections"
                className="mt-3 flex flex-col gap-2 text-sm"
              >
                {sections.map((s) => (
                  <a
                    key={s.index}
                    href={"#policy-section-" + s.index}
                    className="text-pink-700 underline-offset-4 hover:underline"
                  >
                    {s.text}
                  </a>
                ))}
              </nav>
            </details>
          )}
          <div className="flex flex-col gap-4">
            {blocks ? (
              body
            ) : (
              <div className="whitespace-pre-wrap">{policy.text}</div>
            )}
          </div>
        </article>
      </div>
    </main>
  );
}
