"use strict";

function mapLevel(value = 0) {
  switch (value) {
    case 0: return { label: "none", score: 0 };
    case 1: return { label: "low", score: 25 };
    case 2: return { label: "mild", score: 50 };
    case 3: return { label: "medium", score: 75 };
    case 4: return { label: "severe", score: 100 };
    default: return { label: "none", score: 0 };
  }
}

function determineSkinType(skinTypeObj) {
  // skin_type.skin_type (0–3)
  switch (skinTypeObj?.skin_type) {
    case 0: return "normal";
    case 1: return "dry";
    case 2: return "oily";
    case 3: return "combination";
    default: return "unknown";
  }
}

module.exports = {

  analyzeResult(result) {
    const acne = mapLevel(result.acne?.value);
    const blackhead = mapLevel(result.blackhead?.value);
    const pores = mapLevel(result.pores?.value);
    const wrinkle = mapLevel(
      Math.max(
        result.forehead_wrinkle?.value || 0,
        result.crows_feet?.value || 0,
        result.glabella_wrinkle?.value || 0,
        result.nasolabial_fold?.value || 0
      )
    );

    const skinType = determineSkinType(result.skin_type);

    // OVERALL SEVERITY
    const maxScore = Math.max(
      acne.score,
      wrinkle.score,
      pores.score,
      blackhead.score
    );

    let severity = "low";
    if (maxScore >= 75) severity = "high";
    else if (maxScore >= 50) severity = "medium";

    return {
      acneScore: acne.score / 100,
      wrinkleScore: wrinkle.score / 100,
      oilScore: skinType === "oily" ? 0.8 : skinType === "dry" ? 0.2 : 0.5,
      skinType,
      severity,

      // DETAIL UNTUK UI
      details: {
        acne: acne.label,
        wrinkle: wrinkle.label,
        pores: pores.label,
        blackhead: blackhead.label
      }
    };
  }
};
