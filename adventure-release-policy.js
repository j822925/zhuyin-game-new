// Candidate assets are opt-in and immutable. Keep null until a complete candidate
// has been built and verified; normal emergency fixes still update the stable build.
export const ADVENTURE_RELEASE_POLICY=Object.freeze({
  candidate:null,
  // SHA-256 of the authorized class + ':' + full student identifier. This is a
  // rollout selector, not a secret or a replacement for server authentication.
  audience:Object.freeze(['5fd012b99d74c616e39ffe1fb106b93cf3c99b6fbc15d402ae9502a09c8e58f4']),
});
