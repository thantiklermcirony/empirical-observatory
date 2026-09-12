import { createRoot } from 'react-dom/client';
import FamilyWorldLab from '../components/observatory/FamilyWorldLab';

createRoot(document.getElementById('root')!).render(<FamilyWorldLab />);
// The same component also runs as a file without a Site or any API calls.
const adjustLinks = () => {
  for (const link of document.querySelectorAll<HTMLAnchorElement>('a[href^="/"]')) {
    const path = link.getAttribute('href')!;
    if (path === '/research/Two_Family_World_0.1.zip') link.setAttribute('href', 'README.md');
    else if (path.startsWith('/research/two-family-world/')) link.setAttribute('href', path.slice(1));
    else link.setAttribute('href', `https://empirical-observatory.madmanmuzza.chatgpt.site${path}`);
  }
};
new MutationObserver(adjustLinks).observe(document.getElementById('root')!, { subtree: true, childList: true });
