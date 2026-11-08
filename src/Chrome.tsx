import React from "react";
import { Pressable, Text, View } from "react-native";
import { colors } from "./ui";

/** One responsive shell for browser and Android, with compact bottom navigation. */
export function Chrome({ desktop, account, onHome, onAccount, username, children }: {
  desktop: boolean; account: boolean; onHome: () => void; onAccount: () => void; username: string; children: React.ReactNode;
}) {
  const navigation = <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 8 }}>
    {[{ title: "오늘의 학습", icon: "◐", selected: !account, onPress: onHome }, { title: "계정", icon: "⚙", selected: account, onPress: onAccount }].map(item => <Pressable key={item.title} accessibilityRole="tab" aria-selected={item.selected} accessibilityState={{ selected: item.selected }} accessibilityLabel={item.title} onPress={item.onPress} style={({ pressed }) => ({ flex: desktop ? undefined : 1, minHeight: 48, paddingHorizontal: 20, borderRadius: 12, backgroundColor: item.selected ? colors.accentSoft : "transparent", justifyContent: "center", alignItems: "center", gap: 2, opacity: pressed ? 0.7 : 1 })}>
      {!desktop && <Text style={{ color: item.selected ? colors.accent : colors.muted, fontSize: 20 }}>{item.icon}</Text>}
      <Text style={{ color: item.selected ? colors.accent : colors.muted, fontWeight: "600", fontSize: desktop ? 14 : 12 }}>{item.title}</Text>
    </Pressable>)}
  </View>;
  return <View style={{ flex: 1 }}>
    <View style={{ minHeight: 76, paddingHorizontal: desktop ? 28 : 18, gap: 20, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderColor: colors.line, backgroundColor: colors.surface }}>
      <View style={{ backgroundColor: colors.accentSoft, width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 12 }}><Text style={{ color: colors.accent, fontWeight: "800", fontSize: 19 }}>Aa</Text></View>
      <View style={{ flex: desktop ? undefined : 1 }}><Text style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}>English Companion</Text>{!desktop && <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>Words into practice</Text>}</View>
      {desktop && <>{navigation}<Text style={{ color: colors.muted, marginLeft: "auto", fontSize: 13 }}>{username}</Text></>}
    </View>
    <View style={{ flex: 1, minHeight: 0 }}>{children}</View>
    {!desktop && <View style={{ padding: 6, borderTopWidth: 1, borderColor: colors.line, backgroundColor: colors.surface }}>{navigation}</View>}
  </View>;
}
