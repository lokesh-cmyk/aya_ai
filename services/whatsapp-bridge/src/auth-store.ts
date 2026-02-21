import {
  AuthenticationCreds,
  AuthenticationState,
  SignalDataTypeMap,
  initAuthCreds,
  proto,
  BufferJSON,
} from "@whiskeysockets/baileys";
import { prisma } from "./prisma";

export async function usePostgresAuthState(
  sessionId: string
): Promise<{ state: AuthenticationState; saveState: () => Promise<void> }> {
  // Load or create credentials
  const existing = await prisma.whatsAppAuth.findUnique({
    where: { id: sessionId },
  });

  let creds: AuthenticationCreds;
  let keys: Record<string, Record<string, unknown>> = {};

  if (existing) {
    creds = JSON.parse(JSON.stringify(existing.creds), BufferJSON.reviver);
    keys = JSON.parse(JSON.stringify(existing.keys), BufferJSON.reviver);
  } else {
    creds = initAuthCreds();
  }

  const saveState = async () => {
    const credsJson = JSON.parse(JSON.stringify(creds, BufferJSON.replacer));
    const keysJson = JSON.parse(JSON.stringify(keys, BufferJSON.replacer));

    await prisma.whatsAppAuth.upsert({
      where: { id: sessionId },
      update: { creds: credsJson, keys: keysJson },
      create: { id: sessionId, creds: credsJson, keys: keysJson },
    });
  };

  const state: AuthenticationState = {
    creds,
    keys: {
      get: async <T extends keyof SignalDataTypeMap>(
        type: T,
        ids: string[]
      ): Promise<Record<string, SignalDataTypeMap[T]>> => {
        const data: Record<string, SignalDataTypeMap[T]> = {};
        const typeKeys = keys[type] || {};
        for (const id of ids) {
          if (typeKeys[id]) {
            data[id] = typeKeys[id] as SignalDataTypeMap[T];
          }
        }
        return data;
      },
      set: async (data: Record<string, Record<string, unknown>>) => {
        for (const category in data) {
          if (!keys[category]) keys[category] = {};
          for (const id in data[category]) {
            const value = data[category][id];
            if (value) {
              keys[category][id] = value;
            } else {
              delete keys[category][id];
            }
          }
        }
        await saveState();
      },
    },
  };

  return { state, saveState };
}

export async function deleteAuthState(sessionId: string): Promise<void> {
  await prisma.whatsAppAuth.delete({ where: { id: sessionId } }).catch(() => {});
}
