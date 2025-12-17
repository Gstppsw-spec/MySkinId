"use strict";

module.exports = {

  analyzeResult(ai) {
    const acneScore = ai.acne ?? 0;
    const wrinkleScore = ai.wrinkles ?? 0;
    const oilScore = ai.oiliness ?? 0;

    const skinType =
      oilScore > 0.7 ? "oily" :
      oilScore < 0.3 ? "dry" : "normal";

    const severity =
      acneScore > 0.6 || wrinkleScore > 0.6
        ? "high"
        : acneScore > 0.3 || wrinkleScore > 0.3
        ? "medium"
        : "low";

    return {
      acneScore,
      wrinkleScore,
      oilScore,
      skinType,
      severity
    };
  }
};
