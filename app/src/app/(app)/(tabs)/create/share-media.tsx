import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

/** Placeholder for post-capture share / metadata step before publishing. */
export default function CreateShareMediaScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Share media</Text>
      <Text style={styles.hint}>Full-screen flow — hide tab bar when implemented.</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.normal,
    backgroundColor: theme.colors.foundation.background.primary,
  },
  title: {
    color: theme.colors.foundation.foreground.primary,
    fontSize: 18,
    fontWeight: "600",
  },
  hint: {
    marginTop: theme.spacing.small,
    color: theme.colors.foundation.foreground.secondary,
    fontSize: 14,
    textAlign: "center",
  },
}));
