import { GoogleGenAI, Type, Chat, Modality } from "@google/genai";
import { removeRepetitiveText } from '../utils';

// Assume process.env.API_KEY is available in the execution environment.
const ai = new GoogleGenAI({
  apiKey: process.env.API_KEY
});
// Re-export the Chat type for use in the app
export type ChatSession = Chat;

// --- INSTRUCTION FOR AI ---
const UNICODE_PROMPT_INSTRUCTION = "CRITICAL: Do NOT use LaTeX syntax. For all mathematical expressions, chemical formulas, and equations, you MUST use Unicode characters for symbols, subscripts, and superscripts (e.g., Δ, ≥, H₂O, SO₄²⁻). For fractions, use the '/' symbol (e.g., h/4π).";


// --- HELPERS for processing Gemini response ---

const parseGeminiJsonResponse = <T>(responseText: string): T => {
    const cleanedText = responseText
        .trim()
        .replace(/^```json/, '')
        .replace(/```$/, '')
        .trim();
    try {
        return JSON.parse(cleanedText) as T;
    } catch (e) {
        console.error("Failed to parse JSON response:", cleanedText);
        console.error("Original response text was:", responseText);
        throw new Error("Received an invalid JSON response from the AI.");
    }
};


// --- INTERFACES & SCHEMAS ---

export interface MCQ {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  sourceYear?: string;
}

export interface FullTopicData {
    explanation: string;
    mcqs?: MCQ[];
    visualPrompt?: string;
    audioSummaryScript?: string;
}

export interface AncillaryTopicData {
    mcqs: MCQ[];
    visualPrompt: string;
    audioSummaryScript: string;
}

export interface ElementInsights {
    summary: string;
    electronConfiguration: string;
    meltingPoint: string;
    boilingPoint: string;
    applications: string[];
}

export interface Reaction {
    reactionPossible: boolean;
    balancedEquation: string;
    explanation:string;
}

export interface ReactionPrediction {
    balancedEquation: string;
    reactionType: string;
    explanation: string;
    hint: string;
}

export interface NumericalProblem {
    id: string; // e.g., "prob1"
    problemStatement: string; // The full text of the problem
    topic: string; // The specific topic it relates to
}

export interface NumericalSolution {
    methodName: string; // e.g., "Textbook Method", "Dimensional Analysis"
    steps: string; // Step-by-step explanation using markdown
    finalAnswer: string; // The final answer, clearly stated
}

export interface FillInTheBlank {
    question: string;
    answer: string;
    sourceYear?: string;
}

export interface ShortAnswerQuestion {
    question: string;
    answer: string;
    sourceYear?: string;
}
  
export interface UnitTestData {
    mcqs: MCQ[];
    fillInTheBlanks: FillInTheBlank[];
    twoMarksQuestions: ShortAnswerQuestion[];
    threeMarksQuestions: ShortAnswerQuestion[];
    fiveMarksQuestions: ShortAnswerQuestion[];
}

interface TopicsResponse {
  topics: string[];
}

const topicsSchema = {
  type: Type.OBJECT,
  properties: {
    topics: {
      type: Type.ARRAY,
      description: 'A list of important topics from the chapter.',
      items: { type: Type.STRING, description: "An important topic name as plain text. It must not contain any special symbols or icons." }
    }
  },
  required: ['topics']
};

const mcqsSchemaProperties = {
    type: Type.ARRAY,
    description: 'A list of multiple-choice questions.',
    items: {
      type: Type.OBJECT,
      properties: {
        question: { type: Type.STRING, description: 'The question text. Any chemical formulas should be in unicode format (e.g., H2O).' },
        options: {
          type: Type.ARRAY,
          description: 'An array of 4 possible answer strings. Any chemical formulas should be in unicode format.',
          items: { type: Type.STRING }
        },
        correctAnswer: { type: Type.STRING, description: 'The correct answer string, which must be one of the provided options.' },
        explanation: { type: Type.STRING, description: 'A brief explanation for why the correct answer is correct. Any chemical formulas should be in unicode format.' },
        sourceYear: { type: Type.STRING, description: 'The year the question appeared in an exam (e.g., "March 2019"). Optional.' },
      },
      required: ['question', 'options', 'correctAnswer', 'explanation']
    }
};

const explanationSchema = {
    type: Type.OBJECT,
    properties: {
        explanation: {
            type: Type.STRING,
            description: `A clear, 2-3 paragraph explanation of the topic. Use markdown for formatting. ${UNICODE_PROMPT_INSTRUCTION}`
        }
    },
    required: ['explanation']
};

const ancillaryDataSchema = {
    type: Type.OBJECT,
    properties: {
        mcqs: { ...mcqsSchemaProperties, description: 'A list of 4 multiple-choice questions.'},
        visualPrompt: {
            type: Type.STRING,
            description: "A descriptive text prompt for an AI image generator to visualize the core concept."
        },
        audioSummaryScript: {
            type: Type.STRING,
            description: 'A concise, engaging audio summary script of about 250-300 words.'
        }
    },
    required: ['mcqs', 'visualPrompt', 'audioSummaryScript']
};

  const elementInsightsSchema = {
    type: Type.OBJECT,
    properties: {
        summary: { type: Type.STRING, description: 'A concise, one-paragraph summary of the element.' },
        electronConfiguration: { type: Type.STRING, description: 'The electron configuration of the element in unicode format (e.g., 1s22s22p6).' },
        meltingPoint: { type: Type.STRING, description: 'The melting point of the element, including units (e.g., "14.01 K").' },
        boilingPoint: { type: Type.STRING, description: 'The boiling point of the element, including units (e.g., "20.28 K").' },
        applications: {
            type: Type.ARRAY,
            description: 'A list of 3-4 common real-world applications of the element.',
            items: { type: Type.STRING }
        }
    },
    required: ['summary', 'electronConfiguration', 'meltingPoint', 'boilingPoint', 'applications']
};

const reactionSchema = {
    type: Type.OBJECT,
    properties: {
        reactionPossible: { type: Type.BOOLEAN, description: 'Whether a reaction is likely to occur under standard conditions.' },
        balancedEquation: { type: Type.STRING, description: 'The balanced chemical equation for the reaction, using unicode subscripts (e.g., 2Na + Cl2 -> 2NaCl). Should be "N/A" if no reaction occurs.' },
        explanation: { type: Type.STRING, description: 'A brief, one-paragraph explanation of the reaction or why no reaction occurs.' }
    },
    required: ['reactionPossible', 'balancedEquation', 'explanation']
};

const reactionPredictionSchema = {
    type: Type.OBJECT,
    properties: {
        balancedEquation: { type: Type.STRING, description: 'The balanced chemical equation for the reaction, using unicode subscripts (e.g., 2HCl + Ba(OH)2 -> BaCl2 + 2H2O).' },
        reactionType: { type: Type.STRING, description: 'The type of reaction (e.g., "Acid-Base Neutralization", "Redox", "Precipitation").' },
        explanation: { type: Type.STRING, description: 'A detailed explanation of why the reaction occurs, the roles of the reactants, and the products formed.' },
        hint: { type: Type.STRING, description: 'If challengeMode is true, provide a hint about the reaction without giving the final answer.' }
    },
    required: ['balancedEquation', 'reactionType', 'explanation']
};

const numericalsSchema = {
    type: Type.OBJECT,
    properties: {
        problems: {
            type: Type.ARRAY,
            description: 'A list of numerical problems.',
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING, description: 'A unique identifier, e.g., "prob1".' },
                    problemStatement: { type: Type.STRING, description: 'The full text of the numerical problem.' },
                    topic: { type: Type.STRING, description: 'The specific topic the problem relates to.' }
                },
                required: ['id', 'problemStatement', 'topic']
            }
        }
    },
    required: ['problems']
};

const numericalSolutionSchema = {
    type: Type.OBJECT,
    properties: {
        solutions: {
            type: Type.ARRAY,
            description: 'A list of different methods to solve the numerical problem.',
            items: {
                type: Type.OBJECT,
                properties: {
                    methodName: { type: Type.STRING, description: 'The name of the solution method (e.g., "Stoichiometry Method").' },
                    steps: { type: Type.STRING, description: 'A step-by-step guide to solving the problem using markdown.' },
                    finalAnswer: { type: Type.STRING, description: 'The final numerical answer, including units.' }
                },
                required: ['methodName', 'steps', 'finalAnswer']
            }
        }
    },
    required: ['solutions']
};

const unitTestSchema = {
    type: Type.OBJECT,
    properties: {
      mcqs: { ...mcqsSchemaProperties, description: 'A list of 3 multiple-choice questions.'},
      fillInTheBlanks: {
        type: Type.ARRAY,
        description: 'A list of 3 fill-in-the-blank questions.',
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING, description: 'The question text with a blank represented by "____".' },
            answer: { type: Type.STRING, description: 'The word or phrase that fills the blank.' },
            sourceYear: { type: Type.STRING, description: 'The year the question appeared in an exam (e.g., "July 2020"). Optional.' },
          },
          required: ['question', 'answer']
        }
      },
      twoMarksQuestions: {
        type: Type.ARRAY,
        description: 'A list of 2 short answer questions worth 2 marks each.',
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING, description: 'The question text.' },
            answer: { type: Type.STRING, description: 'A model answer for the question.' },
            sourceYear: { type: Type.STRING, description: 'The year the question appeared in an exam (e.g., "July 2020"). Optional.' },
          },
          required: ['question', 'answer']
        }
      },
      threeMarksQuestions: {
        type: Type.ARRAY,
        description: 'A list of 2 short answer questions worth 3 marks each.',
        items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING, description: 'The question text.' },
              answer: { type: Type.STRING, description: 'A model answer for the question.' },
              sourceYear: { type: Type.STRING, description: 'The year the question appeared in an exam (e.g., "July 2020"). Optional.' },
            },
            required: ['question', 'answer']
          }
      },
      fiveMarksQuestions: {
        type: Type.ARRAY,
        description: 'A list of 1 long answer question worth 5 marks.',
        items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING, description: 'The question text, which may include sub-parts (a), (b), etc.' },
              answer: { type: Type.STRING, description: 'A model answer for the question, addressing all sub-parts.' },
              sourceYear: { type: Type.STRING, description: 'The year the question appeared in an exam (e.g., "July 2020"). Optional.' },
            },
            required: ['question', 'answer']
          }
      }
    },
    required: ['mcqs', 'fillInTheBlanks', 'twoMarksQuestions', 'threeMarksQuestions', 'fiveMarksQuestions']
};


// --- API FUNCTIONS ---

export async function getChapterTopics(chapter: string, standard: string, subject: string, currentTopics: string[]): Promise<string[]> {
    const prompt = `List 10 important, yet-unlisted topics for the chapter "${chapter}" for the ${standard} ${subject} syllabus. Do not repeat any topics from this list: [${currentTopics.join(', ')}]. CRITICAL: The topic names MUST be plain text only. Do NOT include any special characters, symbols, or icons like '⇌' at the beginning or anywhere in the topic name.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: topicsSchema,
            thinkingConfig: { thinkingBudget: 0 },
        }
    });

    const data = parseGeminiJsonResponse<TopicsResponse>(response.text ?? '');
    // Add a client-side cleanup to forcefully remove the equilibrium symbol if the AI includes it.
    return (data.topics || []).map(topic => 
        removeRepetitiveText(topic).replace(/⇌/g, '').trim()
    );
}

export async function getTopicExplanation(topic: string, chapter: string, standard: string, subject: string): Promise<string> {
    const prompt = `Generate a clear, 2-3 paragraph explanation for the topic "${topic}" from the chapter "${chapter}" for a ${standard} ${subject} student. Use markdown for formatting. ${UNICODE_PROMPT_INSTRUCTION}`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: explanationSchema,
            thinkingConfig: { thinkingBudget: 0 },
        },
    });

    const rawData = parseGeminiJsonResponse<{ explanation?: string }>(response.text ?? '');
    return removeRepetitiveText(rawData.explanation) || '';
}

export async function getTopicAncillaryData(topic: string, chapter: string, standard: string, subject: string): Promise<AncillaryTopicData> {
     const prompt = `For the topic "${topic}" from the chapter "${chapter}" (${standard} ${subject}), generate the following:
1.  Four relevant multiple-choice questions (MCQs) with an optional sourceYear.
2.  A descriptive prompt for an AI image generator to visualize the concept.
3.  An engaging 250-300 word audio summary script.
${UNICODE_PROMPT_INSTRUCTION}`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: ancillaryDataSchema,
            thinkingConfig: { thinkingBudget: 0 },
        },
    });

    const rawData = parseGeminiJsonResponse<Partial<AncillaryTopicData>>(response.text ?? '');

    const processedMcqs: MCQ[] = (rawData.mcqs || []).map((mcq): MCQ => ({
        question: removeRepetitiveText(mcq?.question),
        options: (mcq?.options || []).map(opt => removeRepetitiveText(opt)),
        correctAnswer: removeRepetitiveText(mcq?.correctAnswer),
        explanation: removeRepetitiveText(mcq?.explanation),
        sourceYear: removeRepetitiveText(mcq?.sourceYear),
    }));

    const data: AncillaryTopicData = {
        mcqs: processedMcqs,
        visualPrompt: removeRepetitiveText(rawData.visualPrompt),
        audioSummaryScript: removeRepetitiveText(rawData.audioSummaryScript),
    };
    return data;
}

export async function getElementInsights(elementName: string): Promise<ElementInsights> {
    const prompt = `Provide key insights for the element: ${elementName}. Include a summary, electron configuration, melting/boiling points, and 3-4 applications. ${UNICODE_PROMPT_INSTRUCTION}`;

    const response = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: elementInsightsSchema,
            thinkingConfig: { thinkingBudget: 0 },
        },
    });
    
    const rawData = parseGeminiJsonResponse<Partial<ElementInsights>>(response.text ?? '');
    const data: ElementInsights = {
        summary: removeRepetitiveText(rawData.summary),
        electronConfiguration: removeRepetitiveText(rawData.electronConfiguration),
        meltingPoint: removeRepetitiveText(rawData.meltingPoint),
        boilingPoint: removeRepetitiveText(rawData.boilingPoint),
        applications: (rawData.applications || []).map(app => removeRepetitiveText(app)),
    };
    return data;
}

export async function getReaction(reactant1: string, reactant2: string): Promise<Reaction> {
    const prompt = `Predict the chemical reaction between ${reactant1} and ${reactant2}. Determine if a reaction is possible, provide the balanced equation, and a brief explanation. ${UNICODE_PROMPT_INSTRUCTION}`;

    const response = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: reactionSchema,
            thinkingConfig: { thinkingBudget: 0 },
        },
    });

    const rawData = parseGeminiJsonResponse<Partial<Reaction>>(response.text ?? '');
    const data: Reaction = {
        reactionPossible: rawData.reactionPossible ?? false,
        balancedEquation: removeRepetitiveText(rawData.balancedEquation),
        explanation: removeRepetitiveText(rawData.explanation),
    };
    return data;
}

export async function predictReactionDetails(reactants: string, challengeMode: boolean): Promise<ReactionPrediction> {
    const prompt = `Predict the reaction for the following reactants: ${reactants}. Provide the balanced equation, reaction type, and a detailed explanation. ${challengeMode ? 'Also, provide a hint instead of the full explanation initially.' : ''} ${UNICODE_PROMPT_INSTRUCTION}`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: reactionPredictionSchema,
            thinkingConfig: { thinkingBudget: 0 },
        },
    });

    const rawData = parseGeminiJsonResponse<Partial<ReactionPrediction>>(response.text ?? '');
    const data: ReactionPrediction = {
        balancedEquation: removeRepetitiveText(rawData.balancedEquation),
        reactionType: removeRepetitiveText(rawData.reactionType),
        explanation: removeRepetitiveText(rawData.explanation),
        hint: removeRepetitiveText(rawData.hint),
    };
    return data;
}

export async function getNumericalsForChapter(chapter: string, standard: string, subject: string): Promise<NumericalProblem[]> {
    const prompt = `Generate a list of 3 diverse, textbook-style numerical problems for the chapter "${chapter}" for a ${standard} ${subject} student. ${UNICODE_PROMPT_INSTRUCTION}`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: numericalsSchema,
            thinkingConfig: { thinkingBudget: 0 },
        },
    });

    const rawData = parseGeminiJsonResponse<{ problems?: Partial<NumericalProblem>[] }>(response.text ?? '');
    return (rawData.problems || []).map((p, index) => ({
        id: p?.id || `prob${index + 1}`,
        problemStatement: removeRepetitiveText(p?.problemStatement),
        topic: removeRepetitiveText(p?.topic) || 'General',
    }));
}

export async function getNumericalSolution(problemStatement: string, chapter: string, standard: string, subject: string): Promise<NumericalSolution[]> {
    const prompt = `For the problem "${problemStatement}" from the chapter "${chapter}" (${standard} ${subject}), provide 2 distinct methods for solving it. For each method, give it a name, a step-by-step explanation using markdown, and the final answer. ${UNICODE_PROMPT_INSTRUCTION}`;

    const response = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: numericalSolutionSchema,
            thinkingConfig: { thinkingBudget: 0 },
        },
    });

    const rawData = parseGeminiJsonResponse<{ solutions?: Partial<NumericalSolution>[] }>(response.text ?? '');
    return (rawData.solutions || []).map(s => ({
        methodName: removeRepetitiveText(s?.methodName) || 'Method',
        steps: removeRepetitiveText(s?.steps),
        finalAnswer: removeRepetitiveText(s?.finalAnswer),
    }));
}

export async function getUnitTestQuestions(chapter: string, standard: string, subject: string): Promise<UnitTestData> {
    const prompt = `Generate a comprehensive unit test for the chapter "${chapter}" for a ${standard} ${subject} student. The test must be based on previous year papers and model papers from the Karnataka PUC board. It should contain exactly: 3 MCQs (with optional sourceYear), 3 Fill-in-the-blanks, 2 two-marks questions, 2 three-marks questions, and 1 five-marks question. Ensure all questions have a source year and provide model answers/explanations for all. ${UNICODE_PROMPT_INSTRUCTION}`;

    const response = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: unitTestSchema,
            thinkingConfig: { thinkingBudget: 0 },
        }
    });

    const rawData = parseGeminiJsonResponse<Partial<UnitTestData>>(response.text ?? '');

    const safeMapShortAnswer = (q?: Partial<ShortAnswerQuestion>): ShortAnswerQuestion => ({
        question: removeRepetitiveText(q?.question),
        answer: removeRepetitiveText(q?.answer),
        sourceYear: removeRepetitiveText(q?.sourceYear),
    });
    
    const data: UnitTestData = {
        mcqs: (rawData.mcqs || []).map((mcq): MCQ => ({
            question: removeRepetitiveText(mcq?.question),
            options: (mcq?.options || []).map(opt => removeRepetitiveText(opt)),
            correctAnswer: removeRepetitiveText(mcq?.correctAnswer),
            explanation: removeRepetitiveText(mcq?.explanation),
            sourceYear: removeRepetitiveText(mcq?.sourceYear),
        })),
        fillInTheBlanks: (rawData.fillInTheBlanks || []).map((fib): FillInTheBlank => ({
            question: removeRepetitiveText(fib?.question),
            answer: removeRepetitiveText(fib?.answer),
            sourceYear: removeRepetitiveText(fib?.sourceYear),
        })),
        twoMarksQuestions: (rawData.twoMarksQuestions || []).map(safeMapShortAnswer),
        threeMarksQuestions: (rawData.threeMarksQuestions || []).map(safeMapShortAnswer),
        fiveMarksQuestions: (rawData.fiveMarksQuestions || []).map(safeMapShortAnswer),
    };
    return data;
}

export async function generateSpeech(script: string, voiceName: string): Promise<string> {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: script }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("The API did not return any audio data.");
    }
    return base64Audio;
}

// --- CHAT FUNCTIONS ---

export function startChatSession(standard: string, chapter: string): ChatSession {
    const systemInstruction = `You are a friendly and expert Chemistry tutor for a ${standard} student in India. The current chapter is "${chapter}". Your role is to help the student understand concepts from this chapter. Keep your explanations clear, concise, and directly related to the chapter topic. Use markdown for formatting. ${UNICODE_PROMPT_INSTRUCTION}`;
    
    return ai.chats.create({
        model: 'gemini-flash-lite-latest',
        config: {
          systemInstruction,
          thinkingConfig: { thinkingBudget: 0 },
        },
    });
}

export async function continueChatStream(session: ChatSession, message: string) {
    return session.sendMessageStream({ message });
}