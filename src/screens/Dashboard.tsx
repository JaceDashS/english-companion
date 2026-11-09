import React, { useContext, useState } from "react";
import { Pressable, View } from "react-native";
import { MAX_STAGE, relativeDay, type UnitRow } from "../domain/dashboard";
import { Btn, Chip, Empty, gradient, Input, Meter, T, Theme, type Palette } from "../ui";

type Accent = "accent" | "good" | "info" | "warn";
/** Summary tile with a colored left stripe and a monospace value, as in Japanese Companion. */
export function Stats({ items, phone }: { phone: boolean; items: { label: string; value: string; hint: string; accent: Accent }[] }) {
  const c = useContext(Theme);
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
    {items.map(item => <View key={item.label} style={{ flexBasis: phone ? "47%" : "22%", flexGrow: 1, minWidth: 0, gap: 3, paddingVertical: 13, paddingRight: 15, paddingLeft: 17, borderWidth: 1, borderColor: c.border, borderRadius: 16, backgroundColor: c.panel, overflow: "hidden" }}>
      <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, backgroundColor: c[item.accent] }} />
      <T size={11.7} tone="dim" weight="600">{item.label}</T>
      <T size={24} mono weight="700" style={{ letterSpacing: -0.5, lineHeight: 32 }}>{item.value}</T>
      <T size={11.5} tone="muted">{item.hint}</T>
    </View>)}
  </View>;
}

/** Vertical bars of words per review stage. */
export function StageChart({ stages }: { stages: { label: string; count: number }[] }) {
  const c = useContext(Theme);
  const maximum = Math.max(1, ...stages.map(item => item.count));
  return <View style={{ flexDirection: "row", gap: 8, height: 132, alignItems: "flex-end" }}>
    {stages.map(item => <View key={item.label} accessibilityLabel={`${item.label} ${item.count}개`} style={{ flex: 1, height: "100%", gap: 5, alignItems: "center" }}>
      <T size={12} mono tone="muted">{item.count}</T>
      <View style={{ flex: 1, width: "100%", maxWidth: 34, borderRadius: 6, backgroundColor: c.raised, justifyContent: "flex-end", overflow: "hidden" }}>
        <View style={[{ height: `${Math.round(item.count / maximum * 100)}%`, minHeight: 3, borderRadius: 6, backgroundColor: item.count ? c.accent : c.border }, item.count ? gradient(`linear-gradient(180deg, ${c.accentStrong}, ${c.accent})`) : null]} />
      </View>
      <T size={11.2} tone="dim">{item.label}</T>
    </View>)}
  </View>;
}

function useHover() {
  const [hover, setHover] = useState(false);
  return { hover, bind: { onHoverIn: () => setHover(true), onHoverOut: () => setHover(false) } };
}

export function RecentUnits({ rows, today, onOpen }: { rows: UnitRow[]; today: string; onOpen: (row: UnitRow) => void }) {
  const recent = rows.filter(row => row.lastDate).sort((a, b) => b.lastDate.localeCompare(a.lastDate)).slice(0, 5);
  if (!recent.length) return <Empty>아직 학습 기록이 없습니다.</Empty>;
  return <View style={{ gap: 6 }}>{recent.map(row => <RecentRow key={row.unit.id} row={row} today={today} onOpen={onOpen} />)}</View>;
}
function RecentRow({ row, today, onOpen }: { row: UnitRow; today: string; onOpen: (row: UnitRow) => void }) {
  const c = useContext(Theme);
  const { hover, bind } = useHover();
  return <Pressable accessibilityRole="button" onPress={() => onOpen(row)} {...bind} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, paddingHorizontal: 12, borderWidth: 1, borderColor: hover ? c.accentLine : c.borderSoft, borderRadius: 11, backgroundColor: c.raised }}>
    <View style={{ flex: 1, minWidth: 0 }}><T size={13.8} weight="600">{row.unit.title}</T><T size={11.5} tone="dim">{relativeDay(row.lastDate, today)} · 정답률 {Math.round(row.passRatio * 100)}%</T></View>
    <View style={{ paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999, borderWidth: 1, borderColor: c.border }}><T size={11.5} mono tone="muted">{row.graduated ? "졸업" : `${row.started}/${row.total}`}</T></View>
  </Pressable>;
}

/** Unit search with a learned-ratio fill behind every tile. */
export function UnitGrid({ rows, phone, onOpen }: { rows: UnitRow[]; phone: boolean; onOpen: (row: UnitRow) => void }) {
  const [query, setQuery] = useState("");
  const [onlyFail, setOnlyFail] = useState(false);
  const [width, setWidth] = useState(0);
  const keyword = query.trim().toLowerCase();
  const shown = rows.filter(row => (!onlyFail || row.failCount > 0) && (!keyword || row.unit.title.toLowerCase().includes(keyword)));
  const minimum = phone ? 128 : 148;
  const columns = Math.max(1, Math.floor((width + 8) / (minimum + 8)));
  const tileWidth = width ? (width - (columns - 1) * 8) / columns : minimum;
  return <View style={{ gap: 10 }}>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      <View style={{ flex: 1, minWidth: 140 }}><Input label="Unit 검색" placeholder="Unit 검색" value={query} onChangeText={setQuery} /></View>
      <Btn title="오답만" variant={onlyFail ? "danger" : "default"} onPress={() => setOnlyFail(!onlyFail)} />
    </View>
    {!rows.length ? <Empty>단어가 추가되면 이곳에 Unit이 표시됩니다.</Empty> : !shown.length ? <Empty>조건에 맞는 Unit이 없습니다.</Empty> : <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {shown.map(row => <UnitTile key={row.unit.id} row={row} width={tileWidth} onOpen={onOpen} />)}
    </View>}
  </View>;
}
function UnitTile({ row, width, onOpen }: { row: UnitRow; width: number; onOpen: (row: UnitRow) => void }) {
  const c = useContext(Theme);
  const { hover, bind } = useHover();
  const percent = row.total ? Math.round(row.started / row.total * 100) : 0;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${row.unit.title} 학습`} onPress={() => onOpen(row)} {...bind} style={{ width, gap: 6, paddingVertical: 10, paddingHorizontal: 11, borderWidth: 1, borderColor: hover ? c.accentLine : c.border, borderRadius: 11, backgroundColor: c.raised, overflow: "hidden" }}>
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${percent}%`, backgroundColor: c.soft }} />
    <T size={13.1} weight="600" numberOfLines={1}>{row.unit.title}</T>
    <T size={11.4} tone="dim">{row.failCount > 0 ? `오답 ${row.failCount}` : `학습 ${percent}%`}</T>
  </Pressable>;
}

export function ProgressPanel({ rows }: { rows: UnitRow[] }) {
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const started = rows.reduce((sum, row) => sum + row.started, 0);
  const average = started ? rows.reduce((sum, row) => sum + row.averageStage * row.started, 0) / started : 0;
  const graduated = rows.filter(row => row.graduated).length;
  const done = rows.filter(row => row.total > 0 && row.started === row.total).length;
  return <View style={{ gap: 16 }}>
    <Meter label="Unit 완료" value={`${done}/${rows.length}`} ratio={rows.length ? done / rows.length : 0} />
    <Meter label="학습한 단어" value={`${started}/${total}`} ratio={total ? started / total : 0} />
    <Meter label="평균 복습 단계" value={`${average.toFixed(2)} / ${MAX_STAGE}`} ratio={average / MAX_STAGE} tone="info" />
    <T size={12.2} tone="dim">졸업한 Unit {graduated}개 · 모든 단어가 30일 간격에 도달하면 졸업합니다.</T>
  </View>;
}

const tint = (c: Palette, soft: string) => gradient(`linear-gradient(150deg, ${soft}, ${c.panel} 60%)`);
/** Queue Unit card: blue review tint or green learning tint with a status chip. */
export function UnitCard({ title, chip, chipTone, meta, tone, onPress }: { title: string; chip: string; chipTone: "review" | "learning" | "fail"; meta: string[]; tone: "review" | "learning"; onPress: () => void }) {
  const c = useContext(Theme);
  const { hover, bind } = useHover();
  return <Pressable accessibilityRole="button" accessibilityLabel={`${title} ${chip}`} onPress={onPress} {...bind}
    style={[{ gap: 9, paddingVertical: 14, paddingHorizontal: 15, borderWidth: 1, borderColor: hover ? c.accentLine : c.border, borderRadius: 16, backgroundColor: c.panel, transform: [{ translateY: hover ? -1 : 0 }] }, tint(c, tone === "review" ? c.infoSoft : c.goodSoft)]}>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}><T size={15.4} weight="700" style={{ flexShrink: 1 }}>{title}</T><Chip tone={chipTone}>{chip}</Chip></View>
    <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 4 }}>{meta.map(text => <T key={text} size={12.5} tone="muted">{text}</T>)}</View>
  </Pressable>;
}
