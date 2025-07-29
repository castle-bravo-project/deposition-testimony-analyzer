import { GoogleGenAI, Type, Schema } from "@google/genai";
import type { AnalysisNode, FlatAnalysisNode, GroundingData, GroundingSource } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getStreamingPrompt = (testimony: string) => `
You are an AI legal analyst powering an interactive mind-mapping tool. The user has provided a deposition testimony and your task is to analyze it.

**CRITICAL INSTRUCTION: RAW NDJSON STREAMING**
Your output **MUST** be a raw stream of **newline-delimited JSON objects (ndjson)**.
- Each line of your output must be a single, complete, valid JSON object.
- Do **NOT** wrap the entire output in a JSON array (\`[]\`).
- Do **NOT** include markdown fences like \`\`\`json or \`\`\`.
- Output **ONLY** the raw JSON objects, one per line.

**NODE STRUCTURE**
Each JSON object must have this structure:
- \`id\`: (string) A unique ID for the node.
- \`parentId\`: (string | null) The ID of the parent node. The root node's parentId MUST be \`null\`.
- \`title\`: (string) A short, descriptive title for the analysis point.
- \`content\`: (string) Detailed analysis or description.
- \`sourceText\`: (string, optional) The *exact verbatim quote* from the provided document that this analysis is based on. ONLY include this for specific, granular points. OMIT this for high-level categories.
- \`veracity\`: (string, optional) One of: 'VERIFIED', 'LIKELY_TRUE', 'UNCERTAIN', 'CONTRADICTORY', 'UNSUPPORTED'.
- \`tone\`: (string[], optional) Array of keywords describing the deponent's tone.
- \`indicators\`: (string[], optional) Array of legal significance keywords. ONLY use these specific keywords: 'EXCULPATORY', 'INCULPATORY', 'HEARSAY'.
- \`sourceNodeId\`: (string, optional) For 'Suggested Motion' nodes only. The ID of the node that justifies the motion.

**LEGAL SIGNIFICANCE INDICATORS**
- **EXCULPATORY:** Apply this tag if a statement, if true, would tend to clear the deponent of blame or guilt.
- **INCULPATORY:** Apply this tag if a statement, if true, would tend to suggest the deponent's involvement in wrongdoing or guilt.
- **HEARSAY:** Apply this tag to statements where the deponent is recounting what someone else said outside of the current legal proceeding.

**ANALYSIS STRUCTURE & ORDER**
You must generate nodes in a valid tree order (parent first, then children).
1.  **Root Node:** Start with a root node titled 'Testimony Summary'.
2.  **Main Categories:** Create children for the root node. Generate them in this order:
    - **Deponent Profile:** A single node. The \`content\` field must be a brief, narrative summary of the deponent's overall demeanor, credibility, and pattern of testimony, synthesizing the various tones and veracity assessments you make elsewhere.
    - **Assumed Prosecution Profile:** A single node. The \`content\` should speculate on the prosecution's likely strategy, arguments, and objectives based on the provided document.
    - **Assumed Defense Profile:** A single node. The \`content\` should speculate on the defense's likely strategy, counter-arguments, and objectives based on the provided document.
    - **Court's Perspective:** A single node. The \`content\` should analyze the testimony from a neutral judicial viewpoint, highlighting points a judge might find persuasive, problematic, or requiring clarification.
    - **Key Claims Made:** A category node. Create children for each distinct claim.
    - **Potential Inconsistencies & Vagueness:** A category node. Create children for each identified issue.
    - **Key Individuals & Relationships:** A category node. For each person mentioned in the provided document, create a child node where the \`title\` is their full name and the \`content\` field is their role or relationship to the events/deponent.
    - **Suggested Motions:** A category node. If the analysis reveals grounds for a legal motion (e.g., to compel discovery due to evasive answers, to strike testimony as hearsay), create a child node for each. The \`title\` must be the motion type (e.g., "Motion to Compel Further Testimony") and the \`content\` field must be the justification. IMPORTANT: For each motion, you MUST include a \`sourceNodeId\` field, referencing the \`id\` of the specific analysis node (e.g., a Key Claim or Inconsistency) that justifies this motion.
    - **Underlying Assumptions:** A category node. Create children for each assumption.
    - **Questions for Cross-Examination:** A category node. Create children for each suggested question.
    - **Observed Emotional Tone:** A category node. Create children for specific moments where tone is notable.

**DEPOSITION TESTIMONY TO ANALYZE:**
---
${testimony}
---

Begin streaming the raw ndjson output now, starting with the root node.
`;


export async function* analyzeTestimonyStream(testimony: string): AsyncGenerator<FlatAnalysisNode> {
  try {
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: getStreamingPrompt(testimony),
      config: {
        temperature: 0.2
      }
    });

    let buffer = "";
    for await (const chunk of responseStream) {
        buffer += chunk.text;
        let eolIndex;
        while ((eolIndex = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, eolIndex).trim();
            buffer = buffer.slice(eolIndex + 1);

            // Robustness: Ignore markdown fences and only parse lines that look like JSON objects.
            if (line.startsWith('{') && line.endsWith('}')) {
                try {
                    const parsed = JSON.parse(line);
                    yield parsed as FlatAnalysisNode;
                } catch (e) {
                    console.error("Failed to parse streamed line:", line, e);
                }
            } else if (line) {
                // Log any non-empty, non-JSON lines for debugging, but otherwise ignore them.
                console.log("Skipping non-JSON line from stream:", line);
            }
        }
    }
    // Process any remaining data in the buffer
    const finalLine = buffer.trim();
    if (finalLine.startsWith('{') && finalLine.endsWith('}')) {
        try {
            const parsed = JSON.parse(finalLine);
            yield parsed as FlatAnalysisNode;
        } catch (e) {
            console.error("Failed to parse final buffer content:", finalLine, e);
        }
    }

  } catch (error) {
    console.error("Error analyzing testimony:", error);
    if (error instanceof Error) {
      throw new Error(`API Error: ${error.message}`);
    }
    throw new Error("An unexpected error occurred during API communication.");
  }
}

export async function getAlternativePerspective(nodeTitle: string, nodeContent: string, originalTestimony: string): Promise<string> {
  const prompt = `
    You are an expert debater and critical thinker AI. Your role is to act as a "devil's advocate" against a specific point made in a legal analysis. You must challenge the given assertion by providing a well-reasoned counter-argument or an alternative perspective.

    Original Testimony Context:
    ---
    ${originalTestimony}
    ---

    Point to Challenge:
    - Title: "${nodeTitle}"
    - Content: "${nodeContent}"

    Your task:
    Provide a concise, critical counter-argument. For example, if the point relies on large numbers to claim something is impossible (like a hash collision), you could argue that the sheer volume of daily operations worldwide could make rare events more plausible than presented. Focus on finding logical flaws, unstated assumptions, or alternative interpretations.

    Return only the text of your counter-argument. Do not include any preamble like "Here is a counter-argument:".
    `;
    
  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            temperature: 0.7, // Higher temperature for more creative/diverse counter-arguments
        }
    });

    return response.text.trim();
  } catch(error) {
    console.error("Error getting alternative perspective:", error);
    if (error instanceof Error) {
        throw new Error(`API Error: ${error.message}`);
    }
    throw new Error("An unexpected error occurred during API communication.");
  }
}

export async function factCheckClaim(claimTitle: string, claimContent: string): Promise<GroundingData> {
  const prompt = `Please act as a neutral fact-checker. Use Google Search to find information about the following claim and provide a brief summary of your findings based ONLY on the search results.
Claim: "${claimTitle}: ${claimContent}"
function getUserApiKey(): string | undefined {
  if (typeof window !== 'undefined') {
    const key = localStorage.getItem('gemini_api_key');
    if (key && key.trim()) return key.trim();
  }
  return process.env.API_KEY;
}

function getAIInstance(): GoogleGenAI {
  const apiKey = getUserApiKey();
  if (!apiKey) {
    throw new Error("Google Gemini API key not set. Please provide your API key in the sidebar settings.");
  }
  return new GoogleGenAI({ apiKey });
}
      config: {
        tools: [{googleSearch: {}}],
      },
    });
    
    const summary = response.text.trim();
    const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    
    const sources: GroundingSource[] = rawChunks
      .map((chunk: any) => ({
        uri: chunk.web?.uri ?? '',
        title: chunk.web?.title ?? 'Unknown Source',
      }))
      .filter(source => source.uri);

    if (summary.length === 0 && sources.length === 0) {
        return { summary: "Could not find relevant information to verify this claim.", sources: [] };
    }

    return { summary, sources };
  } catch(error) {
    console.error("Error during fact check:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred during the fact check.";
    return { summary: `Fact check failed: ${message}`, sources: [] } as GroundingData;
  }
}

export async function generateMotionDocument(
    motionType: string, 
    justification: string, 
    counterArgument?: string, 
    factCheck?: string
): Promise<string> {
  
  const ai = getAIInstance();
  let prompt = `
    You are an expert legal assistant AI. Your task is to draft a formal, high-quality legal motion. The motion should be well-structured, professional, and ready for a lawyer to review and file.\n\n    **Motion Details:**\n    - **Type of Motion:** ${motionType}\n    - **Primary Justification:** ${justification}
  `;
  if (counterArgument) {
    prompt += `\n    - **Additional Context (User-Generated Counter-Argument to Consider):** ${counterArgument}`;
  }
  if (factCheck) {
    prompt += `\n    - **Additional Context (User-Generated Fact-Check to Consider):** ${factCheck}`;
  }
  prompt += `\n\n    **Instructions:**\n    1.  Create a standard motion heading (court, case name, case number, etc.) using placeholder values like "[Court Name]", "[Plaintiff Name]", "[Case Number]".\n    2.  Write a clear introduction stating the motion's purpose.\n    3.  Develop the main body of the motion. Use the **Primary Justification** as the core of your argument.\n    4.  **Crucially, you must intelligently synthesize the \"Additional Context\" (if provided) to strengthen the main argument.** For example, if the justification is that testimony is hearsay, and the fact-check shows the source is unreliable, weave that fact-check finding into the argument to make it more compelling. Do not simply list the context; integrate it logically.\n    5.  Include distinct sections for "Legal Standard" and "Argument".\n    6.  Conclude with a "Conclusion" section summarizing the requested relief.\n    7.  Add a placeholder for the signature block: "[Your Name], Attorney for [Plaintiff/Defendant]".\n    8.  The entire output must be plain text suitable for a document. Do not use Markdown.\n\n    Generate the full text of the motion now.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.3,
      }
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error generating motion document:", error);
    if (error instanceof Error) {
      throw new Error(`API Error: ${error.message}`);
    }
    throw new Error("An unexpected error occurred while generating the motion document.");
  }
}