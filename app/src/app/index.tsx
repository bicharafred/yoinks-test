import { RootMachineContext } from "@/machines/rootMachine";
import { devLog } from "@/utils/devLog";
import { Redirect } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

export default function Index() {
  const state = RootMachineContext.useSelector((state) => state);
  devLog("root", "loggedIn:", state.matches("loggedIn"));

  // 1. Se a máquina estiver no estado logado, mandamos para o Feed (dentro das abas)
  if (state.matches("loggedIn")) {
    SplashScreen.hide();

    return <Redirect href="/(app)/(tabs)/feed" />;
  }

  // 2. Se a máquina estiver deslogada, mandamos para o Login
  if (state.matches("loggedOut")) {
    return <Redirect href="/(auth)/login" />;
  }

  // 3. Enquanto a máquina estiver decidindo (ex: carregando token do MMKV no futuro),
  // o app continua mostrando a Splash Screen nativa porque ainda não retornamos nenhum componente.
  return null;
}
