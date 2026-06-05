import { createMMKV } from "react-native-mmkv";

export const storage = createMMKV();

export const StorageKeys = {
  TOKENS: "yoinks.tokens",
  AUTHOR: "yoinks.author",
  INTERACTION_QUEUE: "yoinks.interactionQueue",
  MOMENT_UPLOAD_QUEUE: "yoinks.momentUploadQueue",
} as const;

/** JSON get/set helpers on top of the shared MMKV instance. */
export const mmkvStorage = {
  set: (key: string, value: any) => storage.set(key, JSON.stringify(value)),
  get: <T>(key: string): T | null => {
    const value = storage.getString(key);
    return value ? JSON.parse(value) : null;
  },
  delete: (key: string) => storage.remove(key),
};
