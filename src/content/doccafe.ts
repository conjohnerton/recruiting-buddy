/** DocCafe entry: pill appears only on candidate-search pages with applied
 *  filters (chips rendered), reading the filters and match count into the note. */
import { mountLogButton, mountPayloadListener } from './log-button.ts';
import { DOCCAFE_BUTTON_KEY } from '../storage-keys.ts';
import {
  docCafeCandidateSearch,
  docCafeResultCountFromNodes,
  isDocCafeCandidateSearch,
  type DocCafeChip,
} from '../doccafe.ts';

function filterChips(): DocCafeChip[] {
  try {
    return Array.from(document.querySelectorAll('.filter-tag-list span'), (el) => ({
      name: el.querySelector('[data-filter-name]')?.getAttribute('data-filter-name') ?? '',
      text: el.textContent?.trim() ?? '',
    })).filter((c) => c.name !== '');
  } catch {
    return [];
  }
}

function candidateCount(): number | null {
  try {
    const el = document.querySelector('.total-jobs');
    if (el?.textContent) {
      const n = parseInt(el.textContent.replace(/,/g, ''), 10);
      if (Number.isFinite(n)) return n;
    }
  } catch {
    /* fall through to body text */
  }
  try {
    const nodes = Array.from(document.querySelectorAll('p,strong,div,span'), (n) => ({ textContent: n.textContent }));
    return docCafeResultCountFromNodes(nodes);
  } catch {
    return null;
  }
}

const site = {
  isSearchPage: () => {
    try {
      return isDocCafeCandidateSearch(window.location.href) && filterChips().length > 0;
    } catch {
      return false;
    }
  },
  buildPayload: () => {
    const chips = filterChips();
    if (!isDocCafeCandidateSearch(window.location.href) || chips.length === 0) return null;
    return docCafeCandidateSearch(window.location.href, candidateCount(), Date.now(), chips);
  },
};

mountLogButton(site, '#1a73e8', DOCCAFE_BUTTON_KEY);
mountPayloadListener(() => (site.isSearchPage() ? site.buildPayload() : null));