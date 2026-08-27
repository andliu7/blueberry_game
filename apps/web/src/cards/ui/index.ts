/**
 * The deck surfaces, in one door.
 *
 * A barrel file exists here for one reason: the shell mounts three screens and
 * should import them from `cards/ui` rather than from three paths that are an
 * implementation detail of this folder. Everything else in the folder is
 * exported too, because the pure functions are what the tests address and a
 * barrel that hides them would just be a second import path to remember.
 *
 * THE THREE SCREENS, and how they fit together:
 *
 *   MyDeck        The hub. A count, one button carrying its reward, the cards
 *                 below it, and deck management underneath that. This is the
 *                 screen the homepage links to.
 *   DeckPicker    For a student who wants to choose rather than start. Decks,
 *                 counts, shuffle, and a start button naming the session size.
 *   ReviewSession The loop. Front, reveal, four ratings.
 *
 * The shell owns the transitions between them: each screen takes callbacks and
 * none of them reads a route. That is the same arrangement app/routes.ts
 * already describes for the tabs, and it is what lets a review start from the
 * hub, from the picker, or from a lesson's own end without three copies of the
 * session.
 */

export { MyDeck, hubHeadline, hubSubline } from "./MyDeck";
export type { MyDeckProps } from "./MyDeck";

export { DeckPicker } from "./DeckPicker";
export type { DeckPickerProps } from "./DeckPicker";

export { ReviewSession } from "./ReviewSession";
export type { ReviewSessionProps } from "./ReviewSession";

export { CardFace } from "./CardFace";
export type { CardFaceProps } from "./CardFace";

export {
  DECK_KIND_LABELS,
  SCOPE_LABELS,
  buildSession,
  deckRowSubtitle,
  deckRows,
  selectAll,
  selectNone,
  startLabel,
  toggleDeck,
} from "./picker";
export type { DeckRow, SessionOptions, SessionScope } from "./picker";

export {
  REVIEW_DIAMONDS_CAP,
  REVIEW_DIAMONDS_PER_CARD,
  currentCard,
  currentCardId,
  isFinished,
  rateCurrent,
  reveal,
  reviewDiamonds,
  sessionCounter,
  sessionProgress,
  sessionSummary,
  startSession,
  summaryHeadline,
  summaryLine,
} from "./session";
export type { RatingRecord, RatingOutcome, ReviewSessionState, SessionSummary } from "./session";

export {
  CARDLESS_BEAT_KINDS,
  cardFromBeat,
  cardIdForBeat,
  deckFromPlaylist,
  deckIdForLesson,
  skippedBeatsNote,
} from "./cardsFromBeats";
export type { GeneratedDeck } from "./cardsFromBeats";

export {
  APKG_EXPORT_NOTE,
  CSV_HEADER,
  DECK_EXPORT_FORMAT,
  DECK_EXPORT_VERSION,
  csvField,
  csvNote,
  csvTags,
  deckExport,
  downloadFile,
  safeFilename,
  toCsv,
  toJson,
} from "./exportDeck";
export type { DeckExport, ExportedCard } from "./exportDeck";

export {
  APKG_IMPORT_NOTE,
  columnsFrom,
  guessSeparator,
  importCsv,
  importIdNote,
  importSummary,
  importedCardId,
  looksLikeHeader,
  parseDelimited,
  stripHtml,
} from "./importCsv";
export type { ColumnMap, ImportOptions, ImportReport, SkippedRow } from "./importCsv";

export { deckNameFromFilename, readDeckFile } from "./importFile";
export type { ImportFileOptions, ImportResult } from "./importFile";

export { intervalLabel } from "./intervalLabel";
export { knownStructureIds, structureFor, structureIdOf, structureOnCard, STRUCTURE_TAG_PREFIX } from "./cardStructure";
export type { CardStructure } from "./cardStructure";
export { useDeckSnapshot } from "./useDeck";
