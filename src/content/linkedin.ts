/** LinkedIn entry: pill appears only on people-search results (SPA-aware).
 *  Visibility also honors the "show LinkedIn button" settings toggle. */
import { mountLogButton, mountPayloadListener } from './log-button.ts';
import { LINKEDIN_BUTTON_KEY } from '../storage-keys.ts';
import { linkedInResultCount, linkedInSearch } from '../linkedin.ts';

const site = {
  isSearchPage: () => {
    try {
      return window.location.pathname.startsWith('/search/results/people');
    } catch {
      return false;
    }
  },
  buildPayload: () => linkedInSearch(window.location.href, linkedInResultCount(document), Date.now()),
};

mountLogButton(site, '#0a66c2', LINKEDIN_BUTTON_KEY);
mountPayloadListener(() => (site.isSearchPage() ? site.buildPayload() : null));