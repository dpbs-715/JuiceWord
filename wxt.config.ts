import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'JuiceWord',
    description: 'Selection-based translation powered by OpenAI-compatible APIs.',
    version: '0.1.0',
    permissions: ['contextMenus', 'storage', 'activeTab'],
    host_permissions: ['<all_urls>'],
  },
});
