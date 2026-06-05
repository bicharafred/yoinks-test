import * as AppleAuthentication from "expo-apple-authentication";
import { createMMKV } from "react-native-mmkv";
import { fromPromise, raise, sendTo, setup } from "xstate";
// Instância de armazenamento rápido para os tokens
export const storage = createMMKV();

export const authMachine = setup({
  actors: {
    getTokenFromProvider: fromPromise(async () => {
      const appleAuthRequestResponse = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Validação recuperada do seu authService.ts original
      if (!appleAuthRequestResponse.identityToken) {
        throw new Error("Could not login with Apple. No identity token.");
      }

      return appleAuthRequestResponse;
    }),

    loginOnServer: fromPromise(
      async ({ input }: { input: { appleAuthRequestResponse: any } }) => {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_BASE_REST}login`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              appleAuthRequest: input.appleAuthRequestResponse,
            }),
          },
        );

        if (!response.ok) {
          throw new Error("Error on loginOnServer " + response.statusText);
        }

        const data = await response.json();
        return data;
      },
    ),

    setCredentialsOnStorage: fromPromise(async ({ input }: { input: any }) => {
      const { tokens, author } = input;
      if (!tokens || !author) {
        throw new Error(
          "Error on setCredentialsOnStorage. Author or tokens not present",
        );
      }

      storage.set("STORAGE_APP_TOKENS", JSON.stringify(tokens));
      storage.set("STORAGE_APP_AUTHOR", JSON.stringify(author));

      return { author };
    }),
  },
}).createMachine({
  id: "auth",
  // Restabelecendo o estado inicial como getProviderData
  initial: "getProviderData",
  on: {
    LOG_IN_USER: [
      {
        target: ".loginOnServer",
      },
    ],
  },
  states: {
    getProviderData: {
      invoke: {
        src: "getTokenFromProvider",
        onDone: [
          {
            actions: [
              raise(({ event }) => ({
                type: "LOG_IN_USER",
                appleAuthRequestResponse: event.output,
              })),
            ],
            guard: ({ event }) => !!event.output,
          },
        ],
        onError: {
          target: "error",
        },
      },
    },
    loginOnServer: {
      invoke: {
        src: "loginOnServer",
        input: ({ event }: any) => ({
          appleAuthRequestResponse: event.appleAuthRequestResponse,
        }),
        onDone: [
          {
            target: "settingCredentials",
            guard: ({ event }) => !!event.output,
          },
        ],
        onError: {
          target: "error",
        },
      },
    },
    settingCredentials: {
      invoke: {
        src: "setCredentialsOnStorage",
        input: ({ event }: any) => ({
          ...event.output,
        }),
        onDone: [
          {
            actions: [
              // Restabelecendo a comunicação com a rootMachine
              sendTo(
                ({ system }) => system.get("root"),
                ({ event }) => ({
                  type: "LOGGED_ON_SERVER",
                  author: event.output.author,
                }),
              ),
            ],
          },
        ],
        onError: {
          target: "error",
        },
      },
    },
    error: {
      entry: [
        sendTo(
          ({ system }) => system.get("root"),
          () => ({
            type: "LOGGED_OUT",
          }),
        ),
      ],
    },
  },
});
