import {CardType} from "src/scheduling";

type RecallState = ["OFF"] | ["ON"] | ["ON", number];

type CardState = ["OFF"] | ["ON"];

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
): [CardType, string, number][] {
    const cards: [CardType, string, number][] = [];

    const lines: string[] = text.replaceAll("\r\n", "\n").split("\n");
    let recallActive: RecallState = ["OFF"];
    let cardState: CardState = ["OFF"];
    let cardBody: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        // check if has a #recall/ tag
        const hasRecallTag = lines[i].includes("#recall/");

        // beginning-of-file logic
        if (i === 0 && hasRecallTag) {
            recallActive = ["ON"];
        }

        // calculate indent level (tabs) w regex
        const indentLevel = lines[i].search(/\S|$/);

        // check if header
        const isHeader = lines[i].startsWith("#");

        // out-of-header logic
        if (recallActive[0] === "ON" && recallActive[1] !== undefined && recallActive[1] < indentLevel) {
            recallActive = ["OFF"];
        }

        // in-header logic
        if (recallActive[0] === "OFF" && isHeader && hasRecallTag) {
            recallActive = ["ON", indentLevel];
        }

        // in-card logic
        if (recallActive[0] === "ON") {
            if (cardState[0] === "OFF" && indentLevel === 0) {
                cardState = ["ON"];
                cardBody = [lines[i]];
            } else if (indentLevel === 0) {
                const cardText = [cardBody[0], multilineCardSeparator, cardBody[1]].join("\n");
                const lineNo = i + 1;
                cards.push([CardType.MultiLineBasic, cardText, lineNo]);
                cardState = ["OFF"];
            } else {
                cardBody.push(lines[i]);
            }
        }
    }
    return cards;
}
