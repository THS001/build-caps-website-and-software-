import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { JsonLd } from "@/components/site/json-ld"

/** FAQ accordion with FAQPage structured data. */
export function FaqList({ items, schema = true }: { items: { q: string; a: string }[]; schema?: boolean }) {
  return (
    <>
      <Accordion type="single" collapsible className="divide-y divide-neutral-200 border-y border-neutral-200">
        {items.map((item, i) => (
          <AccordionItem key={item.q} value={`faq-${i}`} className="border-0">
            <AccordionTrigger className="py-5 text-start text-lg font-semibold text-neutral-900 hover:no-underline">{item.q}</AccordionTrigger>
            <AccordionContent className="pb-6 text-base leading-relaxed text-neutral-600">{item.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      {schema && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: items.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
          }}
        />
      )}
    </>
  )
}
