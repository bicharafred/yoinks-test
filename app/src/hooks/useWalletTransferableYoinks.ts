import type { WalletMachineActorRef } from "@/machines/walletMachine";
import { useEffect, useState } from "react";

/**
 * Mirrors Wallet tab balance semantics via the root Wallet actor (`transferableYoinks`).
 * Subscribes only when `walletRef` exists (avoids passing `null` into `useSelector`).
 */
export function useWalletTransferableYoinks(
  walletRef: WalletMachineActorRef | null,
): number {
  const [yoinks, setYoinks] = useState(0);

  useEffect(() => {
    if (walletRef == null) {
      setYoinks(0);
      return;
    }

    const read = (): void => {
      setYoinks(walletRef.getSnapshot().context.transferableYoinks);
    };

    read();
    const subscription = walletRef.subscribe(read);
    return () => subscription.unsubscribe();
  }, [walletRef]);

  return yoinks;
}
