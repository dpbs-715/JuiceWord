import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'JuiceWord',
    description: 'Selection-based translation powered by OpenAI-compatible APIs.',
    version: '0.1.0',
    permissions: ['contextMenus', 'storage', 'activeTab'],
    host_permissions: ['<all_urls>'],
    icons: {
      16: 'assets/juiceword/icons/icon-16.png',
      32: 'assets/juiceword/icons/icon-32.png',
      48: 'assets/juiceword/icons/icon-48.png',
      128: 'assets/juiceword/icons/icon-128.png',
    },
    action: {
      default_icon: {
        16: 'assets/juiceword/icons/icon-16.png',
        32: 'assets/juiceword/icons/icon-32.png',
        48: 'assets/juiceword/icons/icon-48.png',
        128: 'assets/juiceword/icons/icon-128.png',
      },
    },
    web_accessible_resources: [
      {
        resources: ['assets/juiceword/*.svg', 'assets/juiceword/icons/*.png'],
        matches: ['<all_urls>'],
      },
    ],
  },
});
