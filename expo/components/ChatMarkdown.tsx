import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemeColors } from '@/constants/colors';

interface ChatMarkdownProps {
  text: string;
  colors: ThemeColors;
}

interface ParsedLine {
  type: 'h1' | 'h2' | 'h3' | 'hr' | 'bullet' | 'numbered' | 'tableRow' | 'tableSeparator' | 'text' | 'empty';
  content: string;
  cells?: string[];
  number?: string;
}

function parseLine(line: string): ParsedLine {
  const trimmed = line.trim();

  if (!trimmed) {
    return { type: 'empty', content: '' };
  }
  if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
    return { type: 'hr', content: '' };
  }
  if (trimmed.startsWith('### ')) {
    return { type: 'h3', content: trimmed.replace('### ', '') };
  }
  if (trimmed.startsWith('## ')) {
    return { type: 'h2', content: trimmed.replace('## ', '') };
  }
  if (trimmed.startsWith('# ')) {
    return { type: 'h1', content: trimmed.replace('# ', '') };
  }
  if (/^\|[-:\s|]+\|$/.test(trimmed)) {
    return { type: 'tableSeparator', content: '' };
  }
  if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
    const cells = trimmed
      .slice(1, -1)
      .split('|')
      .map(c => c.trim());
    return { type: 'tableRow', content: trimmed, cells };
  }
  if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
    return { type: 'bullet', content: trimmed.replace(/^[-•]\s/, '') };
  }
  const numMatch = trimmed.match(/^(\d+)\.\s(.+)/);
  if (numMatch) {
    return { type: 'numbered', content: numMatch[2], number: numMatch[1] };
  }

  return { type: 'text', content: trimmed };
}

function renderInlineFormatting(text: string, colors: ThemeColors): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Text key={`t-${lastIndex}`} style={{ color: colors.text }}>
          {text.slice(lastIndex, match.index)}
        </Text>
      );
    }
    parts.push(
      <Text key={`b-${match.index}`} style={{ color: colors.primary, fontFamily: 'InstrumentSerif_400Regular_Italic', fontSize: 18, lineHeight: 24 }}>
        {match[1]}
      </Text>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(
      <Text key={`t-${lastIndex}`} style={{ color: colors.text }}>
        {text.slice(lastIndex)}
      </Text>
    );
  }

  return parts.length > 0 ? parts : [<Text key="full" style={{ color: colors.text, fontFamily: 'Outfit_400Regular' }}>{text}</Text>];
}

export default React.memo(function ChatMarkdown({ text, colors }: ChatMarkdownProps) {
  const parsed = useMemo(() => {
    const lines = text.split('\n');
    const result: ParsedLine[] = [];
    for (const line of lines) {
      result.push(parseLine(line));
    }
    return result;
  }, [text]);

  const tableGroups = useMemo(() => {
    const groups: { startIndex: number; rows: ParsedLine[] }[] = [];
    let currentGroup: ParsedLine[] | null = null;
    let startIdx = -1;

    parsed.forEach((line, idx) => {
      if (line.type === 'tableRow' || line.type === 'tableSeparator') {
        if (!currentGroup) {
          currentGroup = [];
          startIdx = idx;
        }
        currentGroup.push(line);
      } else {
        if (currentGroup) {
          groups.push({ startIndex: startIdx, rows: currentGroup });
          currentGroup = null;
        }
      }
    });
    if (currentGroup) {
      groups.push({ startIndex: startIdx, rows: currentGroup });
    }
    return groups;
  }, [parsed]);

  const tableStartIndices = useMemo(() => {
    const set = new Set<number>();
    tableGroups.forEach(g => {
      for (let i = g.startIndex; i < g.startIndex + g.rows.length; i++) {
        set.add(i);
      }
    });
    return set;
  }, [tableGroups]);

  const ds = useMemo(() => StyleSheet.create({
    container: { gap: 2 },
    h1: { fontSize: 24, fontFamily: 'InstrumentSerif_400Regular', color: colors.primary, marginTop: 12, marginBottom: 8, letterSpacing: -0.2 },
    h2: { fontSize: 22, fontFamily: 'InstrumentSerif_400Regular_Italic', color: colors.text, marginTop: 10, marginBottom: 6, letterSpacing: -0.2 },
    h3: { fontSize: 18, fontFamily: 'InstrumentSerif_400Regular_Italic', color: colors.textSecondary, marginTop: 8, marginBottom: 4, letterSpacing: 0 },
    hr: { height: StyleSheet.hairlineWidth, backgroundColor: colors.textTertiary, marginVertical: 12, opacity: 0.25 },
    bulletRow: { flexDirection: 'row', paddingLeft: 4, marginVertical: 3, alignItems: 'flex-start' },
    bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginRight: 10, marginTop: 8 },
    numberedBadge: { minWidth: 22, marginRight: 6, marginTop: 2 },
    numberedText: { fontSize: 18, fontFamily: 'InstrumentSerif_400Regular_Italic', color: colors.primary, lineHeight: 22 },
    bulletText: { flex: 1, fontSize: 15, fontFamily: 'Outfit_400Regular', lineHeight: 24, color: colors.text, letterSpacing: -0.2 },
    bodyText: { fontSize: 15, fontFamily: 'Outfit_400Regular', lineHeight: 24, color: colors.text, marginVertical: 2, letterSpacing: -0.2 },
    emptyLine: { height: 8 },
    tableContainer: {
      borderRadius: 12,
      overflow: 'hidden',
      marginVertical: 8,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderLight,
    },
    tableHeaderRow: {
      flexDirection: 'row',
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
      backgroundColor: colors.surface,
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 9,
      paddingHorizontal: 14,
    },
    tableRowEven: {
      backgroundColor: 'transparent',
    },
    tableRowOdd: {
      backgroundColor: colors.surface,
    },
    tableHeaderCell: {
      flex: 1,
      fontSize: 13,
      fontFamily: 'Outfit_700Bold',
      color: colors.textSecondary,
      letterSpacing: -0.1,
      textTransform: 'uppercase',
    },
    tableCell: {
      flex: 1,
      fontSize: 14,
      fontFamily: 'Outfit_500Medium',
      color: colors.text,
      lineHeight: 22,
      letterSpacing: -0.1,
    },
    tableCellBold: {
      flex: 1,
      fontSize: 14,
      fontFamily: 'Outfit_700Bold',
      color: colors.primary,
      lineHeight: 22,
      letterSpacing: -0.1,
    },
  }), [colors]);

  const renderTable = (group: { startIndex: number; rows: ParsedLine[] }, key: string) => {
    const dataRows = group.rows.filter(r => r.type === 'tableRow' && r.cells);
    if (dataRows.length === 0) return null;

    const headerRow = dataRows[0];
    const bodyRows = dataRows.slice(1);

    return (
      <View key={key} style={ds.tableContainer}>
        {headerRow.cells && (
          <View style={ds.tableHeaderRow}>
            {headerRow.cells.map((cell, ci) => (
              <Text key={ci} style={ds.tableHeaderCell}>
                {cell.replace(/\*\*/g, '')}
              </Text>
            ))}
          </View>
        )}
        {bodyRows.map((row, ri) => (
          <View key={ri} style={[ds.tableRow, ri % 2 === 0 ? ds.tableRowEven : ds.tableRowOdd]}>
            {row.cells?.map((cell, ci) => {
              const cleaned = cell.replace(/\*\*/g, '');
              const isBold = cell.includes('**');
              return (
                <Text key={ci} style={isBold ? ds.tableCellBold : ds.tableCell}>
                  {cleaned}
                </Text>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  const elements: React.ReactNode[] = [];
  let tableGroupIdx = 0;

  parsed.forEach((line, idx) => {
    if (tableStartIndices.has(idx)) {
      const group = tableGroups[tableGroupIdx];
      if (group && idx === group.startIndex) {
        elements.push(renderTable(group, `table-${idx}`));
        tableGroupIdx++;
      }
      return;
    }

    switch (line.type) {
      case 'h1':
        elements.push(<Text key={idx} style={ds.h1}>{renderInlineFormatting(line.content, colors)}</Text>);
        break;
      case 'h2':
        elements.push(<Text key={idx} style={ds.h2}>{renderInlineFormatting(line.content, colors)}</Text>);
        break;
      case 'h3':
        elements.push(<Text key={idx} style={ds.h3}>{renderInlineFormatting(line.content, colors)}</Text>);
        break;
      case 'hr':
        elements.push(<View key={idx} style={ds.hr} />);
        break;
      case 'bullet':
        elements.push(
          <View key={idx} style={ds.bulletRow}>
            <View style={ds.bulletDot} />
            <Text style={ds.bulletText}>{renderInlineFormatting(line.content, colors)}</Text>
          </View>
        );
        break;
      case 'numbered':
        elements.push(
          <View key={idx} style={ds.bulletRow}>
            <View style={ds.numberedBadge}>
              <Text style={ds.numberedText}>{line.number}.</Text>
            </View>
            <Text style={ds.bulletText}>{renderInlineFormatting(line.content, colors)}</Text>
          </View>
        );
        break;
      case 'empty':
        elements.push(<View key={idx} style={ds.emptyLine} />);
        break;
      case 'text':
        if (line.content) {
          elements.push(<Text key={idx} style={ds.bodyText}>{renderInlineFormatting(line.content, colors)}</Text>);
        }
        break;
    }
  });

  return <View style={ds.container}>{elements}</View>;
});
