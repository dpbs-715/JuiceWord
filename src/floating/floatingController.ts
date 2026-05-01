import { configService } from '../config/configService';
import type { AppLocale } from '../config/configTypes';
import { requestTranslation } from '../messaging/messageClient';
import type { SelectionSnapshot } from '../selection/selectionTypes';
import { FloatingView } from './floatingView';

export class FloatingController {
  private readonly view = new FloatingView();
  private currentSelection: SelectionSnapshot | null = null;
  private locale: AppLocale = 'en';

  constructor() {
    void this.refreshLocale();
  }

  async showLoading(selection: SelectionSnapshot): Promise<void> {
    await this.refreshLocale();
    this.currentSelection = selection;
    this.view.render({ status: 'loading', selection }, this.actions, this.locale);
  }

  async showTooLong(text: string): Promise<void> {
    await this.refreshLocale();
    this.view.render({ status: 'too-long', text }, this.actions, this.locale);
  }

  async showError(message: string, selection?: SelectionSnapshot): Promise<void> {
    await this.refreshLocale();
    this.view.render({ status: 'error', message, selection }, this.actions, this.locale);
  }

  async translate(selection: SelectionSnapshot): Promise<void> {
    await this.showLoading(selection);
    const response = await requestTranslation({ selection });

    if (!response.ok) {
      await this.showError(response.error, selection);
      return;
    }

    this.view.render({ status: 'success', selection, result: response.result }, this.actions, this.locale);
  }

  close(): void {
    this.view.remove();
    this.currentSelection = null;
  }

  private readonly actions = {
    onClose: () => this.close(),
    onCopy: (text: string) => void navigator.clipboard.writeText(text),
    onRetry: () => {
      if (this.currentSelection) {
        void this.translate(this.currentSelection);
      }
    },
    onPin: () => undefined,
  };

  private async refreshLocale(): Promise<void> {
    this.locale = (await configService.getConfig()).uiLanguage;
  }
}
