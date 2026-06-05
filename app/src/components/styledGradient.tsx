import { LinearGradient, LinearGradientProps } from "expo-linear-gradient";
import React from "react";
import { StyleSheet } from "react-native-unistyles";

// Repassamos todas as props do LinearGradient para manter flexibilidade (colors, locations, etc)
export const StyledGradient = (props: LinearGradientProps) => {
  return (
    <LinearGradient
      {...props}
      // O estilo base do Unistyles é mesclado com estilos adicionais passados via prop
      style={[styles.gradient, props.style]}
    />
  );
};

const styles = StyleSheet.create((theme) => ({
  gradient: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: theme.spacing.xlarge,
    borderTopRightRadius: theme.spacing.xlarge,
  },
}));
