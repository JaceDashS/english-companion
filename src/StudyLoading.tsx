import { View } from "react-native";

export function StudySkeleton() {
  return <View accessibilityRole="progressbar" accessibilityLabel="학습 화면 불러오는 중" style={{ flex: 1, gap: 18, padding: 24 }}>
    <View style={{ height: 38, borderRadius: 10, width: "55%", backgroundColor: "#18223a" }} />
    {[0, 1, 2].map(row => <View key={row} style={{ height: 76, borderRadius: 14, backgroundColor: "#131c30" }} />)}
  </View>;
}

