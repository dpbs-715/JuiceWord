export interface ElementBoundingRect {
  width: number;
  height: number;
  top: number;
  left: number;
}

export interface SelectedElementContext {
  id: string;
  capturedAt: number;
  page: {
    title: string;
    url: string;
  };
  element: {
    tagName: string;
    role: string;
    textContent: string;
    selector: string;
    boundingRect: ElementBoundingRect;
  };
  parentChain: Array<{
    tagName: string;
    selector: string;
    textContent: string;
  }>;
  styles: {
    display: string;
    color: string;
    backgroundColor: string;
    fontSize: string;
    fontWeight: string;
    lineHeight: string;
    border: string;
    borderRadius: string;
    padding: string;
    margin: string;
    boxShadow: string;
  };
}

export interface VisualRequirementGenerateRequest {
  context: SelectedElementContext;
  intent: string;
}

export interface VisualRequirementGenerateResult {
  markdown: string;
  modelProfileId: string;
  modelProfileName: string;
}

export type VisualRequirementPanelState =
  | { status: 'empty' }
  | { status: 'ready'; context: SelectedElementContext }
  | { status: 'generating'; context: SelectedElementContext; intent: string }
  | { status: 'success'; context: SelectedElementContext; intent: string; markdown: string }
  | { status: 'error'; context: SelectedElementContext; intent: string; error: string };
