import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

export const colors = {
  background: "#0e1518",
  surface: "#162125",
  surfaceRaised: "#1d2c30",
  line: "#2c3e42",
  text: "#ecf4f1",
  muted: "#9cb1ad",
  accent: "#87d8b3",
  accentSoft: "#243d34",
  accentText: "#10251d",
  pass: "#58c48a",
  fail: "#f07b7b",
};

export const styles = StyleSheet.create({
  screen: { flexGrow: 1, padding: 16, gap: 14, width: "100%", maxWidth: 1320, alignSelf: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  card: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 18, padding: 22, gap: 14 },
  heading: { color: colors.text, fontSize: 20, fontWeight: "700", flexShrink: 1 },
  title: { color: colors.text, fontSize: 36, fontWeight: "700" },
  text: { color: colors.text, fontSize: 16, lineHeight: 24 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  error: { color: colors.fail, fontSize: 14, lineHeight: 20 },
  input: {
    color: colors.text,
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
});

export function Button({
  title,
  onPress,
  disabled = false,
  variant = "default",
  selected = false,
  testID,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "default" | "primary" | "ghost";
  selected?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: selected ? colors.accent : colors.line,
          backgroundColor: variant === "primary" ? colors.accent : selected ? colors.accentSoft : variant === "ghost" ? "transparent" : colors.surfaceRaised,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text style={{ color: variant === "primary" ? colors.accentText : colors.text, fontSize: 16, fontWeight: "600", textAlign: "center" }}>
        {title}
      </Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.muted}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={colors.muted}
        style={styles.input}
        {...props}
      />
    </View>
  );
}
