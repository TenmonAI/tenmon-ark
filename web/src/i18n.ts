export const messages = {
  ja: {
    title: "TENMON-ARK",
    status: "System booted successfully.",
  },
};

export type Locale = "ja";

export const t = (key: keyof typeof messages.ja, locale: Locale = "ja") => {
  return messages[locale][key];
};

