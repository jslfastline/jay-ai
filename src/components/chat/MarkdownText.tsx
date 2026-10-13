import { Linking, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';

import { Palette, Radius, Serif, Spacing } from '@/constants/theme';

import { AppText } from '../ui/AppText';

export interface MarkdownTextProps {
  children: string;
}

const markdownStyles = StyleSheet.create({
  body: {
    color: Palette.text,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Serif.regular,
  },
  text: {
    color: Palette.text,
    fontFamily: Serif.regular,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: Spacing.two,
  },
  heading1: { color: Palette.white, fontFamily: Serif.bold, fontSize: 24, lineHeight: 30, marginBottom: Spacing.two },
  heading2: { color: Palette.white, fontFamily: Serif.bold, fontSize: 21, lineHeight: 27, marginBottom: Spacing.two },
  heading3: { color: Palette.white, fontFamily: Serif.bold, fontSize: 18, lineHeight: 24, marginBottom: Spacing.two },
  heading4: { color: Palette.white, fontFamily: Serif.bold, fontSize: 16, lineHeight: 22, marginBottom: Spacing.one },
  heading5: { color: Palette.white, fontFamily: Serif.bold, fontSize: 15, lineHeight: 20, marginBottom: Spacing.one },
  heading6: { color: Palette.textSecondary, fontFamily: Serif.bold, fontSize: 13, lineHeight: 18, marginBottom: Spacing.one },
  strong: { color: Palette.white, fontFamily: Serif.bold },
  em: { fontStyle: 'italic', fontFamily: Serif.italic },
  link: { color: Palette.primaryBright, textDecorationLine: 'underline' },
  blockquote: {
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
    borderColor: Palette.primary,
    borderLeftWidth: 3,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginVertical: Spacing.one,
    borderRadius: Radius.sm,
  },
  bullet_list: { marginVertical: Spacing.one },
  ordered_list: { marginVertical: Spacing.one },
  list_item: { marginVertical: 2, color: Palette.text },
  hr: { backgroundColor: Palette.border, height: 1, marginVertical: Spacing.three },
  code_inline: {
    color: Palette.primaryBright,
    backgroundColor: 'rgba(56, 128, 248, 0.12)',
    borderWidth: 0,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 1,
    fontFamily: 'monospace',
    fontSize: 14,
  },
  code_block: {
    color: '#e2e8f0',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.md,
    padding: Spacing.three,
    marginVertical: Spacing.two,
    fontFamily: 'monospace',
    fontSize: 13,
  },
  fence: {
    color: '#e2e8f0',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.md,
    padding: Spacing.three,
    marginVertical: Spacing.two,
    fontFamily: 'monospace',
    fontSize: 13,
  },
});

function handleLink(url: string): boolean {
  void Linking.openURL(url).catch(() => {});
  return false;
}

/** Dark-themed Markdown renderer for assistant messages. */
export function MarkdownText({ children }: MarkdownTextProps) {
  return (
    <Markdown style={markdownStyles} onLinkPress={handleLink} mergeStyle>
      {children}
    </Markdown>
  );
}

/** Renders nothing for empty content (used as a safe fallback). */
export function EmptyMarkdown() {
  return <AppText variant="body"> </AppText>;
}
