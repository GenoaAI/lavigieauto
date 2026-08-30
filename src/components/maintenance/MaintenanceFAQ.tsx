'use client';

import React, { useState } from 'react';
import { FAQItem } from '@/types/maintenance';

interface MaintenanceFAQProps {
  faqs: FAQItem[];
}

export function MaintenanceFAQ({ faqs }: MaintenanceFAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="my-8 space-y-3">
      {faqs.map((faq, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={index} className="rounded-xl border border-slate-200 bg-white overflow-hidden transition-colors">
            <button
              onClick={() => toggle(index)}
              className="flex w-full items-center justify-between px-5 py-4 text-left font-semibold text-slate-900 hover:bg-slate-50 transition"
              aria-expanded={isOpen}
            >
              <span>{faq.question}</span>
              <span className="ml-4 flex-shrink-0 text-slate-400">
                {isOpen ? '−' : '+'}
              </span>
            </button>
            {isOpen && (
              <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                {faq.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
