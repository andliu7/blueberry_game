/**
 * Spectroscopy interpretation and degrees of unsaturation. One multiple choice
 * and one numeric.
 *
 * The numeric one is the corpus's example of `sigFigPolicy: "ignore"`. A degree
 * of unsaturation is a count, so significant figures do not apply to it, and the
 * tolerance is deliberately tighter than the default half digit window because
 * an answer between two integers is not a rounding of either.
 */

import { createMultipleChoiceAnswer } from "../answers/choice.js";
import { createNumericAnswer } from "../answers/numeric.js";
import { createProblem, type Problem } from "../problem.js";

export const SPECTROSCOPY_PROBLEMS: readonly Problem[] = Object.freeze([
  createProblem({
    id: "org1-ir-carbonyl-identification",
    course: "orgo_1",
    topic: "spectroscopy_ir",
    difficulty: 1100,
    prompt:
      "A compound of formula C4H8O gives a strong sharp infrared absorption at 1715 reciprocal " +
      "centimetres and nothing between 3200 and 3600. Which compound is it?",
    answer: createMultipleChoiceAnswer({
      options: [
        { id: "butanone", text: "Butan-2-one" },
        { id: "butanol", text: "Butan-1-ol" },
        { id: "butenol", text: "But-3-en-1-ol" },
        { id: "thf", text: "Tetrahydrofuran" },
      ],
      correctOptionId: "butanone",
    }),
    solution: {
      whatHappened:
        "Butan-2-one fits both pieces of evidence: it has the carbonyl the 1715 band reports, and " +
        "no hydroxyl to fill the 3200 to 3600 region.",
      why:
        "A carbon to oxygen double bond is a strong dipole that stretches near 1715 reciprocal " +
        "centimetres, and the band is sharp because the bond is stiff and well defined. A hydroxyl " +
        "group hydrogen bonds to its neighbours, which spreads its stretch into the broad hump " +
        "between 3200 and 3600 that this spectrum does not have.",
      lookAt:
        "Read an infrared spectrum for what is ABSENT as carefully as for what is present. The " +
        "empty hydroxyl region is doing half the work of identifying this compound.",
    },
    distractors: [
      {
        id: "picked-butanol",
        state: { kind: "multiple_choice", optionId: "butanol" },
        explanation: {
          whatHappened: "This picks an alcohol on a spectrum with an empty hydroxyl region.",
          why:
            "Butan-1-ol would show a broad absorption between 3200 and 3600 from the hydrogen " +
            "bonded hydroxyl, and it has no carbon to oxygen double bond to produce the 1715 band " +
            "at all. Both pieces of evidence point away from it.",
          lookAt:
            "Check the 3200 to 3600 region first when the formula allows an alcohol. A broad band " +
            "there is one of the most recognisable signals in the whole spectrum.",
        },
      },
      {
        id: "picked-butenol",
        state: { kind: "multiple_choice", optionId: "butenol" },
        explanation: {
          whatHappened:
            "This picks the compound with a carbon to carbon double bond, reading the 1715 band as an alkene.",
          why:
            "An alkene stretch appears closer to 1650 and is weak, because a carbon to carbon double " +
            "bond has little dipole to change. 1715 with strong intensity is the carbonyl range. " +
            "But-3-en-1-ol also carries a hydroxyl, so it would fill the region that is empty here.",
          lookAt:
            "Use intensity along with position. A strong band near 1700 is a carbonyl, and a weak " +
            "one near 1650 is an alkene.",
        },
      },
      {
        id: "picked-thf",
        state: { kind: "multiple_choice", optionId: "thf" },
        explanation: {
          whatHappened: "This picks the ether, which matches the empty hydroxyl region and nothing else.",
          why:
            "Tetrahydrofuran has a carbon to oxygen SINGLE bond, which stretches near 1100 rather " +
            "than 1715. The strong band at 1715 needs a double bond to oxygen, and an ether has none.",
          lookAt:
            "Separate the single bond region near 1100 from the double bond region near 1700. Both " +
            "involve oxygen and they report different things.",
        },
      },
    ],
    tags: ["infrared", "carbonyl"],
  }),

  createProblem({
    id: "org1-degrees-of-unsaturation",
    course: "orgo_1",
    topic: "degrees_of_unsaturation",
    difficulty: 750,
    prompt: "How many degrees of unsaturation does a compound of formula C6H10 have?",
    answer: createNumericAnswer({
      text: "2",
      sigFigPolicy: "ignore",
      // A count, so the window is narrow on purpose. The default half digit
      // window would be plus or minus 0.5, which reaches the neighbouring
      // integers, and an answer of 1.5 is not a rounding of 2.
      tolerance: { kind: "absolute", value: 0.25 },
    }),
    solution: {
      whatHappened:
        "The saturated formula for six carbons is C6H14, and this compound is four hydrogens short, which is two degrees.",
      why:
        "Every ring and every pi bond costs a molecule two hydrogens against the saturated " +
        "formula, so the hydrogen deficit divided by two counts them. C6H10 could be a compound " +
        "with two double bonds, one triple bond, one ring and one double bond, or two rings, and " +
        "the count does not say which.",
      lookAt:
        "Write the saturated formula 2n plus 2 first, subtract the hydrogens actually present, then " +
        "halve. Here that is 14 minus 10, over 2.",
    },
    distractors: [
      {
        id: "forgot-the-plus-two",
        state: { kind: "numeric", text: "1", unit: null },
        explanation: {
          whatHappened:
            "This uses 2n for the saturated hydrogen count instead of 2n plus 2, giving 12 minus 10 over 2.",
          why:
            "The plus 2 is the two chain ends. A six carbon chain carries two hydrogens on each of " +
            "four middle carbons and three on each end carbon, which totals 14 rather than 12.",
          lookAt:
            "Check the formula against a molecule you know. Hexane is C6H14, and 2n plus 2 has to " +
            "return that.",
        },
      },
      {
        id: "did-not-halve",
        state: { kind: "numeric", text: "4", unit: null },
        explanation: {
          whatHappened: "This is the hydrogen deficit itself, 14 minus 10, with the division by two left out.",
          why:
            "Each degree of unsaturation removes TWO hydrogens: forming a ring takes one from each " +
            "of the two carbons that join, and forming a pi bond does the same. So the deficit " +
            "counts hydrogens and half of it counts degrees.",
          lookAt:
            "Test the halving on benzene. C6H6 is eight hydrogens short of C6H14, and benzene has " +
            "four degrees, which is three double bonds and one ring.",
        },
      },
    ],
    tags: ["formula-analysis"],
  }),
]);
