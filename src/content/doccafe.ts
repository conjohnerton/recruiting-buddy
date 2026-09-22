/** DocCafe entry: pill appears only on listing pages (parse yields keywords).
 *  Visibility also honors the "show DocCafe button" settings toggle. */
import { mountLogButton, mountPayloadListener } from './log-button.ts';
import { DOCCAFE_BUTTON_KEY } from '../storage-keys.ts';
import { docCafeResultCountFromNodes, docCafeSearch, parseDocCafeSearch } from '../doccafe.ts';

function pageNodes(): Array<{ textContent: string | null }> {
  try {
    return Array.from(document.querySelectorAll('div,span,h1,h2,p'), (el) => ({ textContent: el.textContent }));
  } catch {
    return [];
  }
}

const site = {
  isSearchPage: () => {
    try {
      return parseDocCafeSearch(window.location.href, document.title).keywords !== '';
    } catch {
      return false;
    }
  },
  buildPayload: () =>
    docCafeSearch(window.location.href, document.title, docCafeResultCountFromNodes(pageNodes(), document.title), Date.now()),
};

mountLogButton(site, '#1a73e8', DOCCAFE_BUTTON_KEY);
mountPayloadListener(() => (site.isSearchPage() ? site.buildPayload() : null));