"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

type FaqItem = readonly [string, string];

type FaqAccordionProps = {
  items: readonly FaqItem[];
};

export function FaqAccordion({ items }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="faq-accordion-list" role="list">
      {items.map(([question, answer], index) => {
        const isOpen = openIndex === index;
        const itemId = `faq-ans-${index}`;
        const headerId = `faq-head-${index}`;

        return (
          <div
            key={question}
            className={`faq-accordion-item ${isOpen ? "faq-accordion-item--open" : ""}`}
            role="listitem"
          >
            <button
              type="button"
              id={headerId}
              className="faq-accordion-trigger"
              onClick={() => toggle(index)}
              aria-expanded={isOpen}
              aria-controls={itemId}
            >
              <span className="faq-accordion-icon" aria-hidden="true">
                <Plus size={18} className={isOpen ? "faq-accordion-icon--rotated" : ""} />
              </span>
              <span className="faq-accordion-question">{question}</span>
            </button>
            <div
              id={itemId}
              role="region"
              aria-labelledby={headerId}
              className="faq-accordion-panel"
              hidden={!isOpen}
            >
              <p className="faq-accordion-answer">{answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
