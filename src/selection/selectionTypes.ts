export interface SelectionSnapshot {
  text: string;
  rect: {
    top: number;
    left: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  } | null;
}

export type SelectionReadResult =
  | { ok: true; snapshot: SelectionSnapshot }
  | { ok: false; reason: 'empty' | 'too-long'; text?: string };
