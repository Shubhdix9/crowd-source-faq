import React, { useState } from 'react';
import api from '../../utils/api';
import type { FAQItem } from '../../types/ui';
import FreshnessBadge from './FreshnessBadge';
import FlagOutdatedButton from './FlagOutdatedButton';

interface FAQItemProps extends FAQItem {
  onVoteUpdate?: (id: string, helpfulVotes: number, unhelpfulVotes: number) => void;
  onFlagged?: (id: string) => void;
}

const FAQItemComponent = ({
  _id, question, answer,
  helpfulVotes = 0, unhelpfulVotes = 0,
  reviewStatus, lastVerifiedDate, reviewIntervalDays = 0, freshnessTier,
  onVoteUpdate, onFlagged,
}: FAQItemProps) => {
  const [open, setOpen] = useState(false);
  const [voted, setVoted] = useState<'helpful' | 'unhelpful' | null>(null);
  const [hv, setHv] = useState(helpfulVotes);
  const [uhv, setUhv] = useState(unhelpfulVotes);

  const handleVote = async (helpful: boolean) => {
    if (voted) return;
    try {
      const res = await api.patch<{ helpfulVotes: number; unhelpfulVotes: number }>(`/faq/${_id}/feedback`, { helpful });
      setHv(res.data.helpfulVotes);
      setUhv(res.data.unhelpfulVotes);
      setVoted(helpful ? 'helpful' : 'unhelpful');
      onVoteUpdate?.(_id, res.data.helpfulVotes, res.data.unhelpfulVotes);
    } catch {
      // silently fail — voting is best-effort
    }
  };

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start justify-between gap-4 py-4 text-left group"
        aria-expanded={open}
      >
        <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
          <span className="text-sm font-medium text-ink group-hover:text-accent transition-colors leading-snug">
            {question}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <FreshnessBadge
              reviewStatus={reviewStatus}
              lastVerifiedDate={lastVerifiedDate}
              reviewIntervalDays={reviewIntervalDays ?? 0}
              freshnessTier={freshnessTier}
              compact
            />
            <FlagOutdatedButton
              faqId={_id}
              reviewStatus={reviewStatus ?? 'verified'}
              onFlagged={() => onFlagged?.(_id)}
            />
          </div>
        </div>
        <span
          className={`flex-shrink-0 w-5 h-5 rounded-full border
                      flex items-center justify-center
                      transition-all duration-200 mt-0.5
                      ${open ? 'rotate-180 border-accent/40 text-accent bg-accent-light' : 'border-border text-ink-faint'}`}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>

      {open && (
        <div className="pb-4 pr-9 space-y-3">
          <p className="text-sm text-ink-soft leading-relaxed whitespace-pre-line">
            {answer}
          </p>
          {/* Was this helpful? */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-ink-faint">Was this helpful?</span>
            <button
              onClick={() => handleVote(true)}
              disabled={voted !== null}
              title="Helpful"
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all duration-200 ${
                voted === 'helpful'
                  ? 'border-accent/40 bg-accent-light text-accent'
                  : 'border-border text-ink-faint hover:border-accent/40 hover:text-accent'
              } disabled:cursor-default`}
            >
              👍 <span className="font-medium">{hv}</span>
            </button>
            <button
              onClick={() => handleVote(false)}
              disabled={voted !== null}
              title="Not helpful"
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all duration-200 ${
                voted === 'unhelpful'
                  ? 'border-red-200 bg-red-50 text-red-600'
                  : 'border-border text-ink-faint hover:border-red-200 hover:text-red-500'
              } disabled:cursor-default`}
            >
              👎 <span className="font-medium">{uhv}</span>
            </button>
            {voted && <span className="text-xs text-ink-faint ml-1">· thanks for the feedback!</span>}
          </div>
        </div>
      )}
    </div>
  );
};

interface FAQAccordionProps {
  category: string;
  items: FAQItem[];
}

export default function FAQAccordion({ category, items }: FAQAccordionProps) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-subtle overflow-hidden">
      <div className="px-5 py-3 bg-mist border-b border-border">
        <h2 className="text-xs font-serif font-normal text-ink-soft uppercase tracking-wider">
          {category}
        </h2>
      </div>

      <div className="px-5">
        {items.map((faq) => (
          <FAQItemComponent key={faq._id} {...faq} />
        ))}
      </div>
    </div>
  );
}