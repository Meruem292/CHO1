'use server';

/**
 * @fileOverview AI-driven pre-diagnosis based on a patient's reason for visit.
 *
 * - getPreDiagnosis - A function to retrieve AI-driven pre-diagnosis.
 * - PreDiagnosisInput - The input type for the getPreDiagnosis function.
 * - PreDiagnosisOutput - The return type for the getPreDiagnosis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PreDiagnosisInputSchema = z.object({
  reasonForVisit: z.string().describe('The reason for the patient\'s visit, including symptoms and concerns.'),
});
export type PreDiagnosisInput = z.infer<typeof PreDiagnosisInputSchema>;

const PreDiagnosisOutputSchema = z.object({
    possibleConditions: z.array(z.string()).describe('A list of possible medical conditions based on the patient\'s stated reason for visit. This is not a diagnosis.'),
    suggestedActions: z.array(z.string()).describe('A list of suggested actions or questions for the medical provider to consider during the consultation.'),
}).describe('An AI-generated pre-diagnosis analysis.');
export type PreDiagnosisOutput = z.infer<typeof PreDiagnosisOutputSchema>;

export async function getPreDiagnosis(input: PreDiagnosisInput): Promise<PreDiagnosisOutput> {
  const prompt = ai.definePrompt({
    name: 'preDiagnosisPrompt',
    input: {schema: PreDiagnosisInputSchema},
    output: {schema: PreDiagnosisOutputSchema},
    prompt: `You are an expert medical triage AI assistant for a City Health Office.
  Your role is to provide a preliminary analysis of a patient's stated reason for an appointment. This is NOT a diagnosis.
  You are providing suggestions to a qualified medical professional (doctor, midwife, or nurse).

  Based on the following "Reason for Visit", provide a list of possible conditions to consider and a list of suggested actions or questions for the provider.

  Reason for Visit: {{{reasonForVisit}}}

  Keep the language professional and concise. Frame the output as suggestions for a medical professional.
  Example Output for "High fever for 3 days, body aches, and headache":
  {
    "possibleConditions": ["Influenza", "Dengue Fever", "Bacterial Infection"],
    "suggestedActions": ["Check patient's temperature and blood pressure.", "Ask about recent travel history.", "Inquire about exposure to individuals with similar symptoms.", "Consider ordering a complete blood count (CBC)."]
  }

  Format your response as a JSON object matching the output schema.
  `,
  });

  const preDiagnosisFlow = ai.defineFlow(
    {
      name: 'preDiagnosisFlow',
      inputSchema: PreDiagnosisInputSchema,
      outputSchema: PreDiagnosisOutputSchema,
    },
    async (flowInput) => {
      if (!flowInput.reasonForVisit.trim()) {
          return { possibleConditions: [], suggestedActions: [] };
      }
      const {output} = await prompt(flowInput);
      return output!;
    }
  );

  return preDiagnosisFlow(input);
}
