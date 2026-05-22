import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import { configService } from '../../src/config/configService';
import type { ExtensionConfig, ModelProfile } from '../../src/config/configTypes';
import {
  generateVisualRequirement,
  getLatestVisualRequirementContext,
} from '../../src/messaging/messageClient';
import {
  VISUAL_REQUIREMENT_CONTEXT_UPDATED,
  type JuiceWordMessage,
} from '../../src/messaging/messageTypes';
import type {
  SelectedElementContext,
  VisualRequirementPanelState,
} from '../../src/visual-requirement/visualRequirementTypes';

const CONFIG_STORAGE_KEY = 'juiceword.config';
const COPY_RESET_DELAY = 1400;
type CopyStatus = 'idle' | 'copied' | 'error';

export default function App() {
  const [config, setConfig] = useState<ExtensionConfig | null>(null);
  const [state, setState] = useState<VisualRequirementPanelState>({ status: 'empty' });
  const [intent, setIntent] = useState('');
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
  const copyResetTimeoutRef = useRef<number | null>(null);

  const refreshConfig = useCallback(async () => {
    const nextConfig = await configService.getConfig();
    setConfig(nextConfig);
    return nextConfig;
  }, []);

  const refreshContext = useCallback(async () => {
    const response = await getLatestVisualRequirementContext();

    if (response.ok) {
      const nextContext = response.context;
      setState((current) => {
        if (current.status === 'generating' || getStateContext(current)?.id === nextContext.id) {
          return current;
        }

        return { status: 'ready', context: nextContext };
      });
      return nextContext;
    }

    return null;
  }, []);

  useEffect(() => {
    void refreshConfig();
    void refreshContext();

    const handleFocus = () => {
      void refreshConfig();
      void refreshContext();
    };

    const handleRuntimeMessage = (message: unknown) => {
      if (!isVisualRequirementContextUpdatedMessage(message)) {
        return;
      }

      setCopyStatus('idle');
      void refreshContext();
    };

    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName === 'local' && changes[CONFIG_STORAGE_KEY]) {
        void refreshConfig();
      }
    };

    window.addEventListener('focus', handleFocus);
    browser.runtime.onMessage.addListener(handleRuntimeMessage);
    browser.storage.onChanged.addListener(handleStorageChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      browser.runtime.onMessage.removeListener(handleRuntimeMessage);
      browser.storage.onChanged.removeListener(handleStorageChange);
      clearCopyResetTimeout(copyResetTimeoutRef);
    };
  }, [refreshConfig, refreshContext]);

  const context = 'context' in state ? state.context : null;
  const activeProfile = useMemo(() => getActiveProfile(config), [config]);
  const isProfileComplete = isCompleteModelProfile(activeProfile);
  const isGenerating = state.status === 'generating';
  const canGenerate = Boolean(context && intent.trim() && isProfileComplete && !isGenerating);

  async function handleGenerate() {
    if (!context || !canGenerate) {
      return;
    }

    const nextIntent = intent.trim();
    setCopyStatus('idle');

    const latestContext = await refreshContext();
    const generationContext = latestContext ?? context;
    setState({ status: 'generating', context: generationContext, intent: nextIntent });

    const response = await generateVisualRequirement({ context: generationContext, intent: nextIntent });

    if (!response.ok) {
      setState({ status: 'error', context: generationContext, intent: nextIntent, error: response.error });
      return;
    }

    setState({ status: 'success', context: generationContext, intent: nextIntent, markdown: response.result.markdown });
  }

  async function handleCopy(markdown: string) {
    clearCopyResetTimeout(copyResetTimeoutRef);

    try {
      await navigator.clipboard.writeText(markdown);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('error');
    }

    copyResetTimeoutRef.current = window.setTimeout(() => {
      setCopyStatus('idle');
      copyResetTimeoutRef.current = null;
    }, COPY_RESET_DELAY);
  }

  return (
    <main className="jw-sidepanel">
      <header className="jw-sidepanel__header">
        <img src="/assets/juiceword/logo-drop.svg" alt="" />
        <div>
          <h1>视觉需求采集</h1>
          <p>点选页面元素，整理成可交给代码代理的 UI 修改任务。</p>
        </div>
      </header>

      {context ? (
        <ElementSummary context={context} />
      ) : (
        <section className="jw-sidepanel__empty" aria-live="polite">
          <strong>还没有选中元素</strong>
          <span>请先从 JuiceWord 弹窗启动视觉需求采集，然后点击页面上的目标元素。</span>
        </section>
      )}

      <section className="jw-sidepanel__editor">
        <label htmlFor="visual-requirement-intent">修改意图</label>
        <textarea
          id="visual-requirement-intent"
          value={intent}
          onChange={(event) => setIntent(event.target.value)}
          placeholder="例如：把这个按钮调整得更轻盈，强调黄色果汁感，但不要改变当前布局。"
          disabled={isGenerating}
          rows={5}
        />
        {!isProfileComplete ? (
          <button
            type="button"
            className="jw-sidepanel__link"
            onClick={() => browser.runtime.openOptionsPage()}
          >
            去 Options 完成模型配置
          </button>
        ) : null}
        <button
          className="jw-sidepanel__primary"
          type="button"
          disabled={!canGenerate}
          onClick={() => void handleGenerate()}
        >
          {isGenerating ? '生成中...' : '生成任务'}
        </button>
      </section>

      {state.status === 'error' ? (
        <section className="jw-sidepanel__error" aria-live="assertive">
          <strong>生成失败</strong>
          <p>{state.error}</p>
          <button type="button" onClick={() => void handleGenerate()} disabled={!canGenerate}>
            重试
          </button>
        </section>
      ) : null}

      {state.status === 'success' ? (
        <section className="jw-sidepanel__result" aria-live="polite">
          <div>
            <strong>生成结果</strong>
            <button type="button" onClick={() => void handleCopy(state.markdown)}>
              {getCopyLabel(copyStatus)}
            </button>
          </div>
          <pre>{state.markdown}</pre>
        </section>
      ) : null}
    </main>
  );
}

function ElementSummary({ context }: { context: SelectedElementContext }) {
  return (
    <section className="jw-sidepanel__summary">
      <span>选中元素</span>
      <strong>{formatSummary(context)}</strong>
      <details>
        <summary>查看上下文详情</summary>
        <dl>
          <dt>Selector</dt>
          <dd>{context.element.selector}</dd>
          <dt>Page URL</dt>
          <dd>{context.page.url}</dd>
          <dt>Styles</dt>
          <dd>{formatStyles(context)}</dd>
          <dt>Parent Chain</dt>
          <dd>{formatParentChain(context)}</dd>
        </dl>
      </details>
    </section>
  );
}

function getActiveProfile(config: ExtensionConfig | null): ModelProfile | undefined {
  return config?.modelProfiles.find((profile) => profile.id === config.activeModelProfileId);
}

function isVisualRequirementContextUpdatedMessage(
  message: unknown,
): message is Extract<JuiceWordMessage, { type: typeof VISUAL_REQUIREMENT_CONTEXT_UPDATED }> {
  return (
    isRecord(message) &&
    message.type === VISUAL_REQUIREMENT_CONTEXT_UPDATED &&
    isRecord(message.payload) &&
    typeof message.payload.contextId === 'string'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCompleteModelProfile(profile: ModelProfile | undefined): profile is ModelProfile {
  return Boolean(profile?.baseUrl && profile.apiKey && profile.model);
}

function getStateContext(state: VisualRequirementPanelState): SelectedElementContext | null {
  return 'context' in state ? state.context : null;
}

function formatSummary(context: SelectedElementContext): string {
  const text = context.element.textContent ? ` · ${context.element.textContent}` : '';
  return `${context.element.tagName}${text} · ${context.element.boundingRect.width}x${context.element.boundingRect.height}`;
}

function formatStyles(context: SelectedElementContext): string {
  return [
    `display ${context.styles.display}`,
    `color ${context.styles.color}`,
    `background ${context.styles.backgroundColor}`,
    `font ${context.styles.fontSize}/${context.styles.fontWeight}`,
    `radius ${context.styles.borderRadius}`,
    `padding ${context.styles.padding}`,
  ].join(' · ');
}

function formatParentChain(context: SelectedElementContext): string {
  if (context.parentChain.length === 0) {
    return '无';
  }

  return context.parentChain
    .map((parent) => `${parent.tagName} ${parent.selector}`)
    .join(' / ');
}

function clearCopyResetTimeout(timeoutRef: { current: number | null }): void {
  if (timeoutRef.current === null) {
    return;
  }

  window.clearTimeout(timeoutRef.current);
  timeoutRef.current = null;
}

function getCopyLabel(status: CopyStatus): string {
  if (status === 'copied') {
    return '已复制';
  }

  if (status === 'error') {
    return '复制失败';
  }

  return '复制';
}
