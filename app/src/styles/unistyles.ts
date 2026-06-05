import { StyleSheet } from "react-native-unistyles";
import { darkTheme, lightTheme } from "./index"; // O seu arquivo com os temas legados

const appThemes = {
  light: lightTheme,
  dark: darkTheme,
};

// Sobrescrevendo a tipagem do TypeScript para garantir o Auto-Complete perfeito
type AppThemes = typeof appThemes;

declare module "react-native-unistyles" {
  export interface UnistylesThemes extends AppThemes {}
}

// Configuração principal da v3
StyleSheet.configure({
  themes: appThemes,
  settings: {
    adaptiveThemes: true, // Troca automaticamente baseado no tema do OS do usuário
  },
});
