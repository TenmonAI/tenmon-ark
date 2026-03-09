import { createEmptySeed, createSeed } from "./kokuzoSeed.js";

const empty = createEmptySeed("ownerA");

const input = {
  ownerId: "ownerA",
  semanticUnitIds: ["UNIT:001", "UNIT:002"],
  tags: ["tagA", "tagB"],
  laws: ["LAW:A", "LAW:B"],
  phaseProfile: ["L-IN", "R-OUT"],
  integrityAnchor: "ANCHOR:ROOT",
  createdAt: 1700000000000,
};

const seed1 = createSeed(input);
const seed2 = createSeed(input);

console.log(JSON.stringify({
  emptyId: empty.id,
  seed1Id: seed1.id,
  seed2Id: seed2.id,
  deterministic: seed1.id === seed2.id,
  semanticUnitIds: seed1.semanticUnitIds,
  laws: seed1.laws,
  phaseProfile: seed1.phaseProfile,
}, null, 2));
