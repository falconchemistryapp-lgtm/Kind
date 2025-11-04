/**
 * A cleanup function to find and remove duplicated text units from the AI's output.
 * This function safely handles undefined or null inputs.
 * This regex looks for a sequence of characters (.{5,}) that is at least 5 chars long,
 * which is then immediately repeated, possibly with a single space in between (\s?).
 * This is effective at catching duplicated formulas (H₂SO₄H₂SO₄), values (6.67% 6.67%),
 * and even short phrases, without affecting normal text like "bookkeeper".
 * The 'g' flag ensures it replaces all occurrences globally.
 */
export const removeRepetitiveText = (text?: string | null): string => {
    // Safely handle null or undefined inputs.
    if (!text) {
        return '';
    }
    // Return the cleaned text.
    return text.replace(/(.{5,})\s?\1+/g, '$1');
};

/**
 * A best-effort client-side function to format simple LaTeX expressions into Unicode.
 * This is a fallback to clean up text if the AI model fails to follow instructions.
 */
export const formatLatexAsUnicode = (text?: string | null): string => {
    if (!text) return '';

    let formattedText = text;

    // A map of common LaTeX symbols to their Unicode equivalents.
    const symbolMap: { [key: string]: string } = {
        '\\Delta': 'Δ',
        '\\alpha': 'α',
        '\\beta': 'β',
        '\\gamma': 'γ',
        '\\pi': 'π',
        '\\ge': '≥',
        '\\le': '≤',
        '\\rightarrow': '→',
        '\\leftrightarrow': '↔',
        '\\rightleftharpoons': '⇌',
    };

    // Replace known symbols
    for (const latex in symbolMap) {
        // Create a RegExp object. We need to escape backslashes in the latex command.
        const regex = new RegExp(latex.replace(/\\/g, '\\\\'), 'g');
        formattedText = formattedText.replace(regex, symbolMap[latex]);
    }

    // Handle fractions \frac{...}{...} -> (...) / (...)
    formattedText = formattedText.replace(/\\frac{([^}]+)}{([^}]+)}/g, '($1)/($2)');

    // Handle superscripts ^{...} and single char ^. e.g. Ca^{2+} -> Ca²⁺, x^2 -> x²
    const superMap: { [key: string]: string } = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻' };
    formattedText = formattedText.replace(/\^{([^{}]+)}|\^([0-9+\-])/g, (_, group1, group2) => {
        const content = group1 || group2;
        return content.split('').map((char: string) => superMap[char] || char).join('');
    });

    // Handle subscripts _{...} and single char _. e.g. H_{2}O -> H₂O, H_2 -> H₂
    const subMap: { [key: string]: string } = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
    formattedText = formattedText.replace(/_{([^{}]+)}|_([0-9])/g, (_, group1, group2) => {
        const content = group1 || group2;
        return content.split('').map((char: string) => subMap[char] || char).join('');
    });

    // Remove math mode delimiters ($)
    formattedText = formattedText.replace(/\$/g, '');

    return formattedText;
};