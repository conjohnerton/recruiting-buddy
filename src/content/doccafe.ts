/** DocCafe entry: pill appears only on listing pages (parse yields keywords). */
import { mountLogButton } from './log-button.ts';
import { docCafeResultCountFromNodes, docCafeSearch, parseDocCafeSearch } from '../doccafe.ts';

function pageNodes(): Array<{ textContent: string | null }> {
  try {
    return Array.from(document.querySelectorAll('div,span,h1,h2,p'), (el) => ({ textContent: el.textContent }));
  } catch {
    return [];
  }
}

mountLogButton(
  {
    isSearchPage: () => {
      try {
        return parseDocCafeSearch(window.location.href, document.title).keywords !== '';
      } catch {
        return false;
      }
    },
    buildPayload: () =>
      docCafeSearch(window.location.href, document.title, docCafeResultCountFromNodes(pageNodes(), document.title), Date.now()),
  },
  '#1a73e8',
);
