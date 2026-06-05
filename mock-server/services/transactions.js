"use strict";

function ledgerEntryToHistoryItem(entry) {
  const yoinks = entry.amountYoinks ?? 0;
  const abs    = Math.abs(yoinks);
  const plural = abs === 1 ? "Yoink" : "Yoinks";

  switch (entry.type) {
    case "YOINKS_PURCHASED":
      return {
        id:          entry.id,
        type:        entry.type,
        title:       "Yoinks purchased",
        subtitle:    "Pack purchase",
        amountLabel: `+${abs} ${plural}`,
        unit:        "YOINKS",
        status:      entry.status,
        createdAt:   entry.createdAt,
      };
    case "YOINKS_SPENT":
      return {
        id:          entry.id,
        type:        entry.type,
        title:       "Moment unlocked",
        subtitle:    entry.momentId ? `Moment ${entry.momentId}` : "Unlock",
        amountLabel: `-${abs} ${plural}`,
        unit:        "YOINKS",
        status:      entry.status,
        createdAt:   entry.createdAt,
      };
    case "REFERRAL_REWARD":
      return {
        id:          entry.id,
        type:        entry.type,
        title:       "Referral reward",
        subtitle:    "Friend joined",
        amountLabel: `+${abs} ${plural}`,
        unit:        "YOINKS",
        status:      entry.status,
        createdAt:   entry.createdAt,
      };
    default:
      return null;
  }
}

module.exports = { ledgerEntryToHistoryItem };
