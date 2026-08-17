'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { FaqRichItem } from '@/components/faq-editor';

type FaqHorizontalAccordionProps = {
  items: FaqRichItem[];
  className?: string;
};

/**
 * Horizontálně "slidující" FAQ akordeon (inspirace The Plus Addons – Demo4).
 *
 * Na větších obrazovkách se otázky zobrazují jako svislé pruhy vedle sebe;
 * aktivní otázka se plynule roztáhne doprava a odpověď "vyjede" zprava doleva.
 * Na mobilu se komponenta chová jako klasický svislý akordeon.
 */
export function FaqHorizontalAccordion({ items, className }: FaqHorizontalAccordionProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (items.length === 0) return null;

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop / tablet – horizontální akordeon */}
      <div className="hidden md:flex h-[420px] w-full gap-2">
        {items.map((item, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              aria-expanded={isActive}
              aria-label={item.question}
              style={{
                flexGrow: isActive ? 12 : 0,
                flexBasis: isActive ? '0%' : '4rem',
                flexShrink: 0,
              }}
              className={cn(
                'group relative flex min-w-[4rem] overflow-hidden rounded-xl border text-left',
                'transition-[flex-grow,flex-basis,background-color,border-color] duration-[600ms]',
                'ease-[cubic-bezier(0.22,1,0.36,1)]',
                isActive
                  ? 'cursor-default border-amber-300 bg-[#f8f5f0]'
                  : 'cursor-pointer border-border bg-card hover:border-amber-300 hover:bg-amber-50/60',
              )}
            >
              {/* Svislý pruh (číslo + ikona + rotovaná otázka) – vždy viditelný */}
              <div className="flex w-16 flex-shrink-0 flex-col items-center justify-between py-4">
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                    isActive
                      ? 'bg-amber-500 text-white'
                      : 'bg-amber-100 text-amber-700 group-hover:bg-amber-200',
                  )}
                >
                  <Plus
                    className={cn(
                      'h-5 w-5 transition-transform duration-500',
                      isActive && 'rotate-45',
                    )}
                  />
                </span>

                <span
                  className={cn(
                    'flex-1 py-3 text-sm font-semibold tracking-wide',
                    '[writing-mode:vertical-rl] rotate-180 whitespace-nowrap',
                    'max-h-full overflow-hidden text-ellipsis',
                    isActive ? 'text-amber-700' : 'text-foreground/70 group-hover:text-foreground',
                  )}
                >
                  <span className="text-amber-500">{idx + 1}.</span> {item.question}
                </span>
              </div>

              {/* Obsah aktivní otázky – "vyjede" zprava doleva */}
              <div
                className={cn(
                  'flex min-w-0 flex-1 flex-col overflow-hidden py-5 pr-6',
                  'transition-[opacity,transform] duration-500 ease-out',
                  isActive
                    ? 'pointer-events-auto translate-x-0 opacity-100 delay-150'
                    : 'pointer-events-none translate-x-6 opacity-0',
                )}
              >
                <h3 className="mb-3 whitespace-normal text-lg font-bold text-foreground">
                  {item.question}
                </h3>
                <div className="min-h-0 flex-1 overflow-y-auto pr-2">
                  <div
                    className="faq-rich text-sm text-foreground/85"
                    dangerouslySetInnerHTML={{ __html: item.answerHtml }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Mobil – klasický svislý akordeon */}
      <div className="flex flex-col gap-2 md:hidden">
        {items.map((item, idx) => {
          const isActive = idx === activeIndex;
          return (
            <div
              key={idx}
              className={cn(
                'overflow-hidden rounded-xl border transition-colors',
                isActive ? 'border-amber-300 bg-[#f8f5f0]' : 'border-border bg-card',
              )}
            >
              <button
                type="button"
                onClick={() => setActiveIndex(isActive ? -1 : idx)}
                aria-expanded={isActive}
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
              >
                <span className="text-base font-semibold text-foreground">
                  <span className="text-amber-500">{idx + 1}.</span> {item.question}
                </span>
                <span
                  className={cn(
                    'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors',
                    isActive ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700',
                  )}
                >
                  <Plus
                    className={cn('h-4 w-4 transition-transform duration-300', isActive && 'rotate-45')}
                  />
                </span>
              </button>
              <div
                className={cn(
                  'grid transition-all duration-300 ease-out',
                  isActive ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                )}
              >
                <div className="overflow-hidden">
                  <div
                    className="faq-rich px-4 pb-4 text-sm text-foreground/85"
                    dangerouslySetInnerHTML={{ __html: item.answerHtml }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
