import { createSeed } from "./kokuzoSeed.js";

const caseA = createSeed({
  ownerId: "ownerA",
  semanticUnitIds: ["UNIT:001", "UNIT:002"],
  tags: ["tagA", "tagB"],
  laws: ["LAW:A", "LAW:B"],
  phaseProfile: ["L-IN", "R-OUT"],
  integrityAnchor: "ANCHOR:ROOT",
  createdAt: 1700000000000,
});

const caseB = createSeed({
  ownerId: "ownerA",
  semanticUnitIds: [" UNIT:001 ", "UNIT:002", "UNIT:001"],
  tags: ["tagA", "tagA", " tagB "],
  laws: ["LAW:A", "LAW:B", "LAW:A"],
  phaseProfile: ["L-IN", "R-OUT", "L-IN"],
  integrityAnchor: "ANCHOR:ROOT",
  createdAt: 1700000000000,
});

const caseC = createSeed({
  ownerId: "ownerA",
  semanticUnitIds: ["UNIT:001", "UNIT:002"],
  tags: ["tagA", "tagB"],
  laws: ["LAW:A", "LAW:B"],
  phaseProfile: ["L-IN", "R-OUT"],
  createdAt: 1700000000000,
});

console.log(JSON.stringify({
  caseA: {
    id: caseA.id,
    semanticUnitIds: caseA.semanticUnitIds,
    laws: caseA.laws,
    phaseProfile: caseA.phaseProfile,
  },
  caseB: {
    id: caseB.id,
    semanticUnitIds: caseB.semanticUnitIds,
    laws: caseB.laws,
    phaseProfile: caseB.phaseProfile,
  },
  caseC: {
    id: caseC.id,
    semanticUnitIds: caseC.semanticUnitIds,
    laws: caseC.laws,
    phaseProfile: caseC.phaseProfile,
  },
  sameIdAfterNormalize: caseA.id === caseB.id,
  differentWithoutAnchor: caseA.id !== caseC.id,
}, null, 2));
