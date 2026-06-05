import Constants from "expo-constants";
import type { PropsWithChildren } from "react";
import { StripeProvider } from "@stripe/stripe-react-native";

function readStripePublishableKey(): string {
  const v = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  return typeof v === "string" ? v.trim() : "";
}

/** Apple Pay entitlement id (`merchant.*`); omit until configured in Xcode. */
function readOptionalMerchantIdentifier(): string | undefined {
  const v = process.env.EXPO_PUBLIC_STRIPE_MERCHANT_IDENTIFIER;
  const trimmed = typeof v === "string" ? v.trim() : "";
  return trimmed === "" ? undefined : trimmed;
}

function resolveUrlScheme(): string {
  const configured = Constants.expoConfig?.scheme;
  if (typeof configured === "string" && configured.trim() !== "") {
    return configured.trim();
  }
  return "yoinksapp";
}

/**
 * Enables Stripe natives for PaymentSheet when `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set.
 * If the variable is absent, renders children unchanged (Stripe is not wired to money flows yet).
 */
export function StripeProviderGate({ children }: PropsWithChildren) {
  const publishableKey = readStripePublishableKey();
  if (publishableKey === "") {
    return children;
  }

  return (
    <StripeProvider
      merchantIdentifier={readOptionalMerchantIdentifier()}
      publishableKey={publishableKey}
      urlScheme={resolveUrlScheme()}
    >
      <>{children}</>
    </StripeProvider>
  );
}
