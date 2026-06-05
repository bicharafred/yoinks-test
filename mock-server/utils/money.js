"use strict";

const { USD_MICROS_PER_DOLLAR, YOINK_VALUE_USD_MICROS, CREATOR_SHARE_BPS } = require("../config/env");

/** $1.00 → 1_000_000 */
function dollarsToMicros(dollars) {
  return Math.round(dollars * USD_MICROS_PER_DOLLAR);
}

/** 100 cents → 1_000_000 micros  (1 cent = 10,000 micros) */
function centsToMicros(cents) {
  return cents * 10_000;
}

/** 1_000_000 micros → 1.00 */
function microsToDisplay(micros) {
  return `$${(micros / USD_MICROS_PER_DOLLAR).toFixed(2)}`;
}

/** micros → integer cents (for API responses the app expects in cents) */
function microsToCents(micros) {
  return Math.round(micros / 10_000);
}

/** micros → float dollars (for compatibility shim to transferable/redeemable) */
function microsToDollars(micros) {
  return micros / USD_MICROS_PER_DOLLAR;
}

/** yoinksCount → transferable float (for getWalletBalance GraphQL compat) */
function yoinksToTransferable(yoinksCount) {
  return yoinksCount * YOINK_VALUE_USD_MICROS / USD_MICROS_PER_DOLLAR;
}

/** transferable float → yoinksCount integer */
function transferableToYoinks(transferable) {
  return Math.round(transferable / (YOINK_VALUE_USD_MICROS / USD_MICROS_PER_DOLLAR));
}

/** Creator share of one Yoink unlock in micros (70%) */
function creatorShareMicros() {
  return Math.floor(YOINK_VALUE_USD_MICROS * CREATOR_SHARE_BPS / 10_000);
}

/** Platform fee of one Yoink unlock in micros (30%) */
function platformFeeMicros() {
  return YOINK_VALUE_USD_MICROS - creatorShareMicros();
}

module.exports = {
  dollarsToMicros,
  centsToMicros,
  microsToDisplay,
  microsToCents,
  microsToDollars,
  yoinksToTransferable,
  transferableToYoinks,
  creatorShareMicros,
  platformFeeMicros,
};
