/** LinkedIn entry: pill appears only on people-search results (SPA-aware). */
import { mountLogButton } from './log-button.ts';
import { linkedInResultCount, linkedInSearch } from '../linkedin.ts';

mountLogButton(
  {
    isSearchPage: () => {
      try {
        return window.location.pathname.startsWith('/search/results/people');
      } catch {
        return false;
      }
    },
    buildPayload: () => linkedInSearch(window.location.href, linkedInResultCount(document), Date.now()),
  },
  '#0a66c2',
);
