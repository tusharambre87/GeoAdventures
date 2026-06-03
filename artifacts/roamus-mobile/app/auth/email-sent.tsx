import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function EmailSent() {
  return (
    <View style={styles.root}>
      <ActivityIndicator size="large" color="#E8692A" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F2EE", alignItems: "center", justifyContent: "center" },
});
