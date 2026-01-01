import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { Node as ProseMirrorNode } from 'prosemirror-model';

export interface LogicBreakRange {
  from: number;
  to: number;
  reason?: string;
}

export const logicBreaksKey = new PluginKey<DecorationSet>('logicBreaks');

export const LogicBreaksExtension = Extension.create({
  name: 'logicBreaks',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: logicBreaksKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, set) {
            const meta = tr.getMeta(logicBreaksKey) as DecorationSet | undefined;
            if (meta) {
              return meta;
            }
            if (tr.docChanged) {
              return set.map(tr.mapping, tr.doc);
            }
            return set;
          },
        },
        props: {
          decorations(state) {
            return logicBreaksKey.getState(state);
          },
        },
      }),
    ];
  },
});

export function buildLogicBreakDecorations(
  doc: ProseMirrorNode,
  ranges: LogicBreakRange[]
): DecorationSet {
  if (!ranges.length) {
    return DecorationSet.empty;
  }

  const decorations: Decoration[] = [];
  ranges.forEach((range) => {
    if (range.from >= range.to) return;
    decorations.push(
      Decoration.inline(range.from, range.to, { class: 'logic-break' })
    );
    decorations.push(
      Decoration.widget(
        range.from,
        () => {
          const dot = document.createElement('span');
          dot.className = 'logic-break-dot';
          if (range.reason) {
            dot.title = range.reason;
          }
          return dot;
        },
        { side: -1 }
      )
    );
  });

  return DecorationSet.create(doc, decorations);
}
