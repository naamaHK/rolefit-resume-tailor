(function attachPlacementFlow(global) {
  "use strict";

  function create(dependencies) {
    const { resolvePlacement, unique } = dependencies || {};
    if (typeof resolvePlacement !== "function" || typeof unique !== "function") {
      throw new TypeError("Placement flow requires resolvePlacement() and unique().");
    }

    function getSelectedPlacements(change) {
      if (Array.isArray(change?.placements)) {
        return unique(change.placements.filter((placement) => placement && placement !== "undecided"));
      }
      const placement = resolvePlacement(change || {});
      return placement && placement !== "undecided" ? [placement] : [];
    }

    function getPendingSelectedPlacements(change) {
      const accepted = new Set(change?.acceptedPlacements || []);
      return getSelectedPlacements(change).filter((placement) => placement !== "omit" && !accepted.has(placement));
    }

    function getPlacementsToApply(change) {
      if (Array.isArray(change?.acceptedPlacements) && change.acceptedPlacements.length) {
        return unique(change.acceptedPlacements.filter((placement) => placement && placement !== "undecided"));
      }
      return getSelectedPlacements(change);
    }

    function buildSinglePlacementChange(change, placement) {
      return {
        ...change,
        placement,
        placements: [placement],
        acceptedPlacements: []
      };
    }

    function acceptPlacement({ change, placement, currentResume, validate, apply, normalize }) {
      if (!placement) return { ok: false, error: "Choose a resume section before saving." };
      if (typeof validate !== "function" || typeof apply !== "function" || typeof normalize !== "function") {
        throw new TypeError("Placement acceptance requires validate(), apply(), and normalize().");
      }

      const singlePlacementChange = buildSinglePlacementChange(change, placement);
      const validation = validate(singlePlacementChange, currentResume) || {};
      if (validation.error) return { ok: false, error: validation.error, validation };

      const appliedResume = placement === "omit"
        ? currentResume
        : normalize(apply(singlePlacementChange));
      if (placement !== "omit" && appliedResume === normalize(currentResume)) {
        return { ok: false, error: "The selected resume target is no longer available or already contains this change." };
      }

      const acceptedPlacements = unique([...(change?.acceptedPlacements || []), placement]);
      const selected = getSelectedPlacements(change).filter((item) => item !== "omit");
      const complete = selected.length > 0 && selected.every((item) => acceptedPlacements.includes(item));

      return {
        ok: true,
        appliedResume,
        singlePlacementChange,
        acceptedPlacements,
        complete,
        status: complete ? "accepted" : "partial"
      };
    }

    return Object.freeze({
      acceptPlacement,
      buildSinglePlacementChange,
      getPendingSelectedPlacements,
      getPlacementsToApply,
      getSelectedPlacements
    });
  }

  global.RoleFitPlacementFlow = Object.freeze({ create });
})(typeof window !== "undefined" ? window : globalThis);
