import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

/** Library tokens: deep green-black with brass, ivy and sky accents; light keeps a parchment palette. */
const dark = {
  bg: "#0f1513", header: "#121a17", panel: "#16201c", raised: "#1b2622", sunken: "#22302b",
  border: "#26332d", borderSoft: "#1f2b26", text: "#e8efe9", muted: "#a3b0a8", dim: "#74827a",
  accent: "#d9b45a", accentStrong: "#ecca78", soft: "rgba(217, 180, 90, 0.14)", accentLine: "rgba(217, 180, 90, 0.38)",
  good: "#6fbf8e", goodSoft: "rgba(111, 191, 142, 0.14)", goodLine: "rgba(111, 191, 142, 0.32)",
  warn: "#d98a6a", warnSoft: "rgba(217, 138, 106, 0.14)", info: "#7fb3d9", infoSoft: "rgba(127, 179, 217, 0.14)", infoLine: "rgba(127, 179, 217, 0.32)",
  error: "#e57b6e", errorSoft: "rgba(229, 123, 110, 0.14)", errorLine: "rgba(229, 123, 110, 0.38)",
  onAccent: "#1f1806", backdrop: "rgba(5, 8, 7, 0.6)", glow: "rgba(217, 180, 90, 0.07)", infoEnd: "#a9cde8",
};
const light: typeof dark = {
  bg: "#f5f1e6", header: "#efe9da", panel: "#ffffff", raised: "#faf7ef", sunken: "#f0eadc",
  border: "#ddd3bf", borderSoft: "#e8e0cf", text: "#1f2622", muted: "#56615a", dim: "#7d877f",
  accent: "#8a6a1c", accentStrong: "#6f5412", soft: "rgba(138, 106, 28, 0.1)", accentLine: "rgba(138, 106, 28, 0.3)",
  good: "#3d7f57", goodSoft: "rgba(61, 127, 87, 0.12)", goodLine: "rgba(61, 127, 87, 0.3)",
  warn: "#a8593a", warnSoft: "rgba(168, 89, 58, 0.12)", info: "#3a6f98", infoSoft: "rgba(58, 111, 152, 0.12)", infoLine: "rgba(58, 111, 152, 0.3)",
  error: "#b8473a", errorSoft: "rgba(184, 71, 58, 0.1)", errorLine: "rgba(184, 71, 58, 0.3)",
  onAccent: "#ffffff", backdrop: "rgba(31, 38, 34, 0.4)", glow: "rgba(138, 106, 28, 0.06)", infoEnd: "#6d9bc0",
};
export type Palette = typeof dark;
export const Theme = createContext<Palette>(dark);
export const palettes = { dark, light };
/** Phone layout flag for parts whose shape differs by device, such as sheets. */
export const Device = createContext({ phone: true });

export const fonts = {
  sans: Platform.select({ web: "Pretendard, \"Segoe UI Variable\", \"Malgun Gothic\", system-ui, sans-serif", default: undefined }),
  serif: Platform.select({ web: "\"Iowan Old Style\", Georgia, \"Times New Roman\", serif", default: "serif" }),
  mono: Platform.select({ web: "\"JetBrains Mono\", \"Cascadia Mono\", ui-monospace, monospace", default: "monospace" }),
};
/** CSS gradients: background-image on web, experimental_backgroundImage on Android. */
export function gradient(css: string): ViewStyle {
  return (Platform.OS === "web" ? { backgroundImage: css } : { experimental_backgroundImage: css }) as ViewStyle;
}
export const primaryFill = (c: Palette) => gradient(`linear-gradient(120deg, ${c.accent}, ${c.accentStrong})`);

export const layout = StyleSheet.create({
  body: { padding: 20, paddingTop: 18, paddingBottom: 40, gap: 16, width: "100%", maxWidth: 1240, alignSelf: "center" },
  phoneBody: { padding: 14, paddingBottom: 26, gap: 12, width: "100%" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  stack: { gap: 10 },
});

type Tone = "text" | "muted" | "dim" | "accent" | "error" | "good";
/** Themed text; size follows the former rem scale (16px base). */
export function T({ children, tone = "text", size = 14, weight, mono = false, serif = false, style, selectable = false, numberOfLines }: {
  children: React.ReactNode; tone?: Tone; size?: number; weight?: TextStyle["fontWeight"]; mono?: boolean; serif?: boolean;
  style?: StyleProp<TextStyle>; selectable?: boolean; numberOfLines?: number;
}) {
  const c = useContext(Theme);
  return <Text selectable={selectable} numberOfLines={numberOfLines} style={[{ color: c[tone], fontSize: size, fontWeight: weight, fontFamily: mono ? fonts.mono : serif ? fonts.serif : fonts.sans, lineHeight: Math.round(size * 1.5) }, style]}>{children}</Text>;
}
export function Label({ children, muted = false, large = false, error = false }: { children: React.ReactNode; muted?: boolean; large?: boolean; error?: boolean }) {
  return <T selectable tone={error ? "error" : muted ? "muted" : "text"} size={large ? 17 : muted ? 13 : 14} weight={large ? "700" : undefined}>{children}</T>;
}

export function Card({ title, hint, actions, children, style }: { title?: React.ReactNode; hint?: string; actions?: React.ReactNode; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useContext(Theme);
  return <View style={[{ borderWidth: 1, borderColor: c.border, borderRadius: 16, backgroundColor: c.panel, padding: 16 }, style]}>
    {title ? <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <T size={14.7} weight="700">{title}</T>{hint ? <T size={11.8} tone="dim" weight="500">{hint}</T> : null}
      {actions ? <View style={{ marginLeft: "auto" }}>{actions}</View> : null}
    </View> : null}
    <View style={layout.stack}>{children}</View>
  </View>;
}

type Variant = "default" | "primary" | "ghost" | "danger";
/** Former jc-btn: default, primary gradient, ghost and danger variants; icon and large sizes. */
export function Btn({ title, onPress, variant = "default", size = "md", disabled = false, selected = false, testID, label, style, children }: {
  title?: string; onPress: () => void; variant?: Variant; size?: "md" | "icon" | "lg"; disabled?: boolean; selected?: boolean; testID?: string; label?: string;
  style?: StyleProp<ViewStyle>; children?: React.ReactNode;
}) {
  const c = useContext(Theme);
  const [hover, setHover] = useState(false);
  const tone = selected ? "danger" : variant;
  const fill = tone === "primary" ? primaryFill(c) : null;
  const color = tone === "primary" ? c.onAccent : selected ? c.accentStrong : tone === "danger" ? c.error : c.text;
  // Selected buttons use the brass accent; danger uses the error color.
  return <Pressable accessibilityRole="button" accessibilityLabel={label ?? title} accessibilityState={{ disabled, selected }} disabled={disabled} onPress={onPress} testID={testID}
    onHoverIn={() => setHover(true)} onHoverOut={() => setHover(false)}
    style={({ pressed }) => [{
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: size === "lg" ? 46 : 36, minWidth: size === "icon" ? 36 : undefined,
      paddingVertical: 7, paddingHorizontal: size === "icon" ? 7 : 13, borderRadius: 11, borderWidth: 1,
      borderColor: tone === "primary" ? "transparent" : selected ? c.accentLine : tone === "danger" ? c.errorLine : hover && !disabled ? c.accentLine : c.border,
      backgroundColor: tone === "primary" ? c.accent : tone === "ghost" ? "transparent" : selected ? c.soft : tone === "danger" ? c.errorSoft : c.raised,
      opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
    }, fill, style]}>
    {children ?? <T size={size === "lg" ? 15.2 : size === "icon" ? 15 : 13.6} weight="600" style={{ color }}>{title}</T>}
  </Pressable>;
}
/** Kept for screens that only need a plain or selected button. */
export function Action({ title, onPress, disabled = false, selected = false, testID }: { title: string; onPress: () => void; disabled?: boolean; selected?: boolean; testID?: string }) {
  return <Btn title={title} onPress={onPress} disabled={disabled} selected={selected} testID={testID} />;
}

export type ChipTone = "review" | "learning" | "fail" | "pass" | "mute";
export function Chip({ tone, children }: { tone: ChipTone; children: React.ReactNode }) {
  const c = useContext(Theme);
  const [bg, fg, line] = tone === "review" ? [c.infoSoft, c.info, c.infoLine] : tone === "learning" || tone === "pass" ? [c.goodSoft, c.good, c.goodLine] : tone === "fail" ? [c.errorSoft, c.error, c.errorLine] : [c.sunken, c.muted, c.border];
  return <View style={{ alignSelf: "flex-start", paddingVertical: 2, paddingHorizontal: 9, borderRadius: 999, borderWidth: 1, borderColor: line, backgroundColor: bg }}><T size={11.4} weight="700" style={{ color: fg, lineHeight: 16 }}>{children}</T></View>;
}

export function Meter({ ratio, tone, label, value }: { ratio: number; tone?: "info"; label?: string; value?: string }) {
  const c = useContext(Theme);
  const percent = Math.max(0, Math.min(100, Math.round(ratio * 100)));
  const bar = <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent }} style={{ height: 7, borderRadius: 999, backgroundColor: c.sunken, overflow: "hidden" }}>
    <View style={[{ height: "100%", width: `${percent}%`, borderRadius: 999, backgroundColor: tone === "info" ? c.info : c.accent }, gradient(tone === "info" ? `linear-gradient(90deg, ${c.info}, ${c.infoEnd})` : `linear-gradient(90deg, ${c.accent}, ${c.accentStrong})`)]} />
  </View>;
  if (label === undefined) return bar;
  return <View style={{ gap: 6 }}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}><T size={12.8} tone="muted">{label}</T><T size={12.8} mono weight="600">{value}</T></View>{bar}</View>;
}

export function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  const c = useContext(Theme);
  return <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: on }} onPress={onToggle} style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
    <T size={12.5} tone="muted">{label}</T>
    <View style={{ width: 42, height: 24, borderRadius: 999, borderWidth: 1, borderColor: on ? c.accentLine : c.border, backgroundColor: on ? c.soft : c.sunken }}>
      <View style={{ position: "absolute", top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: 9, backgroundColor: on ? c.accent : c.dim }} />
    </View>
  </Pressable>;
}

export function CopyId({ id, onCopy }: { id: string; onCopy: (id: string) => void }) {
  const c = useContext(Theme);
  const [hover, setHover] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={`ID ${id} 복사`} onPress={() => onCopy(id)} onHoverIn={() => setHover(true)} onHoverOut={() => setHover(false)}
    style={{ paddingVertical: 2, paddingHorizontal: 7, borderRadius: 999, borderWidth: 1, borderColor: hover ? c.accentLine : c.border, backgroundColor: c.raised }}>
    <T size={11.2} mono tone={hover ? "accent" : "dim"} style={{ lineHeight: 16 }}>{id}</T>
  </Pressable>;
}

/** Former jc-segment: a compact one-of-many switch. */
export function Segment<K extends string | number>({ options, value, onChange }: { options: Array<{ key: K; label: string }>; value: K | null; onChange: (key: K) => void }) {
  const c = useContext(Theme);
  return <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", padding: 3, gap: 2, borderRadius: 11, borderWidth: 1, borderColor: c.border, backgroundColor: c.raised, alignSelf: "flex-start" }}>
    {options.map(option => <Pressable key={String(option.key)} accessibilityRole="radio" accessibilityState={{ checked: value === option.key }} onPress={() => onChange(option.key)}
      style={{ paddingVertical: 5, paddingHorizontal: 12, borderRadius: 7, backgroundColor: value === option.key ? c.soft : "transparent" }}>
      <T size={12.8} weight="600" style={{ color: value === option.key ? c.accentStrong : c.muted }}>{option.label}</T>
    </Pressable>)}
  </View>;
}

export function Input({ value, onChangeText, placeholder, label, multiline = false, testID, onBlur, autoFocus, style, sunken = false, onSubmit, secure = false }: {
  value: string; onChangeText: (value: string) => void; placeholder?: string; label?: string; multiline?: boolean; testID?: string; onBlur?: () => void;
  autoFocus?: boolean; style?: StyleProp<TextStyle>; sunken?: boolean; onSubmit?: () => void; secure?: boolean;
}) {
  const c = useContext(Theme);
  return <TextInput accessibilityLabel={label ?? placeholder} testID={testID} value={value} onChangeText={onChangeText} onBlur={onBlur} autoFocus={autoFocus} placeholder={placeholder}
    placeholderTextColor={c.dim} autoCapitalize="none" autoCorrect={false} spellCheck={false} multiline={multiline} secureTextEntry={secure} textAlignVertical={multiline ? "top" : "center"} onSubmitEditing={onSubmit}
    style={[{ minHeight: multiline ? 92 : 38, paddingVertical: multiline ? 10 : 7, paddingHorizontal: multiline ? 12 : 11, borderRadius: 11, borderWidth: 1, borderColor: c.border,
      backgroundColor: multiline || sunken ? c.header : c.raised, color: c.text, fontSize: multiline ? 13.8 : 14, lineHeight: multiline ? 22 : undefined, fontFamily: fonts.sans }, style]} />;
}
/** Former jc-field: a muted bold caption above an input. */
export function Field({ label, value, onChangeText, multiline = false, testID, onBlur, placeholder, style }: { label: string; value: string; onChangeText: (value: string) => void; multiline?: boolean; testID?: string; onBlur?: () => void; placeholder?: string; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ gap: 6 }, style]}><T size={13.1} tone="muted" weight="600">{label}</T><Input label={label} value={value} onChangeText={onChangeText} multiline={multiline} testID={testID} onBlur={onBlur} placeholder={placeholder} /></View>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  const c = useContext(Theme);
  return <View style={{ padding: 22, alignItems: "center", borderWidth: 1, borderStyle: "dashed", borderColor: c.border, borderRadius: 11 }}><T size={13.4} tone="dim" style={{ textAlign: "center" }}>{children}</T></View>;
}
export function Spinner() {
  const c = useContext(Theme);
  return <ActivityIndicator size={12} color={c.accent} />;
}

/** Bottom sheet with a grip on phones and a centered dialog on PC, as in the former UI. */
export function Sheet({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  const c = useContext(Theme);
  const { phone } = useContext(Device);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return <Modal transparent animationType={phone ? "slide" : "fade"} onRequestClose={onClose}>
    <View style={{ flex: 1, backgroundColor: c.backdrop, justifyContent: phone ? "flex-end" : "center", alignItems: phone ? "stretch" : "center", padding: phone ? 0 : 28 }}>
      <Pressable accessibilityLabel="닫기" onPress={onClose} style={StyleSheet.absoluteFill} />
      <View accessibilityRole="none" aria-modal style={{ width: "100%", maxWidth: phone ? undefined : 680, maxHeight: phone ? "86%" : "78%", backgroundColor: c.panel, borderWidth: 1, borderColor: c.border, borderBottomWidth: phone ? 0 : 1, borderRadius: phone ? 0 : 16, borderTopLeftRadius: phone ? 20 : 16, borderTopRightRadius: phone ? 20 : 16 }}>
        {phone && <View style={{ position: "absolute", top: 7, alignSelf: "center", width: 38, height: 4, borderRadius: 999, backgroundColor: c.border }} />}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 14, paddingBottom: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: c.borderSoft }}>
          <T size={15} weight="700" style={{ flex: 1 }}>{title}</T>{footer}<Btn variant="ghost" size="icon" title="×" label="닫기" onPress={onClose} />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 20, gap: 12 }}>{children}</ScrollView>
      </View>
    </View>
  </Modal>;
}

/** Pill toast: bottom center above the tab bar on phones, bottom right on PC. */
export function Toast({ text, tone, phone }: { text: string; tone?: string; phone: boolean }) {
  const c = useContext(Theme);
  return <View pointerEvents="none" style={[{ position: "absolute", zIndex: 90, bottom: phone ? 76 : 22, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: tone === "error" ? c.errorLine : c.border, backgroundColor: c.sunken, maxWidth: 460, boxShadow: "0 16px 38px rgba(0, 0, 0, 0.5)" } as ViewStyle, phone ? { alignSelf: "center", marginHorizontal: 16 } : { right: 22 }]}>
    <Text accessibilityRole={tone === "error" ? "alert" : "summary"} style={{ color: tone === "error" ? c.error : c.text, fontSize: 13.4, fontWeight: "600", textAlign: "center", fontFamily: fonts.sans }}>{text}</Text>
  </View>;
}

/** Older helpers kept for the Google button and notices. */
export const colors = { background: dark.bg, surface: dark.header, surfaceRaised: dark.raised, line: dark.border, text: dark.text, muted: dark.muted, accent: dark.accent };
export const styles = StyleSheet.create({
  text: { fontSize: 15, lineHeight: 23, color: dark.text, fontFamily: fonts.sans },
  muted: { fontSize: 13, lineHeight: 20, color: dark.muted, fontFamily: fonts.sans },
  heading: { fontSize: 17, fontWeight: "700", color: dark.text, fontFamily: fonts.sans },
  error: { fontSize: 13, lineHeight: 20, color: dark.error, fontFamily: fonts.sans },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: dark.border, backgroundColor: dark.panel, gap: 10 },
});
