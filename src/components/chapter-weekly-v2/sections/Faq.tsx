import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { FAQ_ITEMS } from "../data";

const Faq = () => (
  <section className="py-20 md:py-28 px-4 bg-background">
    <div className="max-w-3xl mx-auto">
      <h2 className="text-3xl md:text-5xl font-bold text-foreground text-center mb-12">
        שאלות שחוזרות
      </h2>

      <Accordion type="single" collapsible className="space-y-3">
        {FAQ_ITEMS.map((item, i) => (
          <AccordionItem
            key={item.q}
            value={`faq-${i}`}
            className="bg-card rounded-xl border border-border/60 px-5 md:px-6 shadow-sm data-[state=open]:border-primary/30 transition-colors"
          >
            <AccordionTrigger className="text-lg font-semibold text-foreground text-right hover:no-underline py-5">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-foreground/80 leading-relaxed pb-5 whitespace-pre-line">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </section>
);

export default Faq;
