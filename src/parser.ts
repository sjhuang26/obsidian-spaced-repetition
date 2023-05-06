import { CardType } from "src/scheduling";

type RecallState = ["OFF"] | ["ON", null] | ["ON", number];

type CardState = ["OFF"] | ["ON"];

export type ParseCard = [CardType, string, number, string];

/**
 * Returns flashcards found in `text`
 *
 * @param text - The text to extract flashcards from
 * @param singlelineCardSeparator - Separator for inline basic cards
 * @param singlelineReversedCardSeparator - Separator for inline reversed cards
 * @param multilineCardSeparator - Separator for multiline basic cards
 * @param multilineReversedCardSeparator - Separator for multiline basic card
 * @returns An array of [CardType, card text, line number] tuples
 */
export function parse(
    text: string,
    singlelineCardSeparator: string,
    singlelineReversedCardSeparator: string,
    multilineCardSeparator: string,
    multilineReversedCardSeparator: string,
    convertHighlightsToClozes: boolean,
    convertBoldTextToClozes: boolean,
    convertCurlyBracketsToClozes: boolean
): ParseCard[] {
    const cards: ParseCard[] = [];

    const lines: string[] = text.replaceAll("\r\n", "\n").split("\n");
    let recallActive: RecallState = ["OFF"];
    let cardState: CardState = ["OFF"];
    let cardBody: string[] = [];
    let cardBefore = "";
    let cardLineNo = 0;

    for (let i = 0; i < lines.length; i++) {
        // check if has a #recall/ or #/recall tag
        const hasRecallTag = lines[i].includes("#recall/") || lines[i].includes("#/recall");

        // beginning-of-file logic
        if (i === 0 && hasRecallTag) {
            recallActive = ["ON", null];
        }

        // calculate indent level (tabs) w regex
        const indentLevel = lines[i].search(/\S|$/);

        // represents header: 0 for no header; 1, 2, 3, etc. for header level
        // count "#" characters at beginning of line
        // e.g., "## Header" => 2
        const headerLevel = lines[i].match(/^#+/)?.[0].length ?? 0;

        // out-of-header may make recall inactive
        if (
            recallActive[0] === "ON" &&
            recallActive[1] !== null &&
            headerLevel !== 0 &&
            headerLevel <= recallActive[1]
        ) {
            recallActive = ["OFF"];
        }

        // in-header may make recall active
        if (recallActive[0] === "OFF" && headerLevel !== 0 && hasRecallTag) {
            recallActive = ["ON", headerLevel];
        }

        // end of card
        if (cardState[0] === "ON" && (indentLevel === 0 || i === lines.length - 1)) {
            // empty cards do not count
            if (0 < cardBody.length) {
                const cardText = cardBody.join("\n");
                cards.push([CardType.MultiLineBasic, cardText, cardLineNo, cardBefore]);
            }
            cardState = ["OFF"];
        }
        // beginning of card
        if (
            recallActive[0] === "ON" &&
            cardState[0] === "OFF" &&
            indentLevel === 0 &&
            lines[i].startsWith("- ") &&
            !(lines[i].startsWith("- {") && lines[i].endsWith("}")) &&
            !lines[i].startsWith("- //") &&
            !lines[i].endsWith(":")
        ) {
            cardState = ["ON"];
            cardBody = [];
            cardLineNo = i + 1;
            cardBefore = lines.slice(Math.max(i - 10, 0), i).join("\n");
        }
        // between beginning and end of card
        if (cardState[0] === "ON") {
            cardBody.push(lines[i]);
        }
    }
    return cards;
}
