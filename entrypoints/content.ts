import { mountContentApp } from '../src/app/contentApp';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    mountContentApp();
  },
});
