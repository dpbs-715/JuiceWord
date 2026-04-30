import { requestTranslation } from '../messaging/messageClient';
import type { SelectionSnapshot } from '../selection/selectionTypes';
import { FloatingView } from './floatingView';

export class FloatingController {
  private readonly view = new FloatingView();
  private currentSelection: SelectionSnapshot | null = null;

  showLoading(selection: SelectionSnapshot): void {
    this.currentSelection = selection;
    this.view.render({ status: 'loading', selection }, this.actions);
  }

  showTooLong(text: string): void {
    this.view.render({ status: 'too-long', text }, this.actions);
  }

  showError(message: string, selection?: SelectionSnapshot): void {
    this.view.render({ status: 'error', message, selection }, this.actions);
  }

  async translate(selection: SelectionSnapshot): Promise<void> {
    this.showLoading(selection);
    const response = await requestTranslation({ selection });

    if (!response.ok) {
      this.showError(response.error, selection);
      return;
    }

    this.view.render({ status: 'success', selection, result: response.result }, this.actions);
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
}
