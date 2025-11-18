'use server';

/**
 * @fileOverview AI-driven health suggestions based on mother and baby records.
 *
 * - getHealthSuggestions - A function to retrieve AI-driven health suggestions.
 * - HealthSuggestionsInput - The input type for the getHealthSuggestions function.
 * - HealthSuggestionsOutput - The return type for the getHealthSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const HealthSuggestionsInputSchema = z.object({
  motherConsultationRecords: z.string().describe('Consultation records for the mother.'),
  maternityHistory: z.string().describe('Detailed maternity history of the mother.'),
  babyHealthRecords: z.string().describe('Health records for the baby.'),
});
export type HealthSuggestionsInput = z.infer<typeof HealthSuggestionsInputSchema>;

const HealthSuggestionsOutputSchema = z.object({
  suggestions: z.array(
    z.object({
      intervention: z.string().describe('The suggested health intervention.'),
      rationale: z.string().describe('The rationale behind the suggestion.'),
    })
  ).describe('A list of AI-driven health suggestions.'),
});
export type HealthSuggestionsOutput = z.infer<typeof HealthSuggestionsOutputSchema>;

export async function getHealthSuggestions(input: HealthSuggestionsInput): Promise<HealthSuggestionsOutput> {
  const prompt = ai.definePrompt({
    name: 'healthSuggestionsPrompt',
    input: {schema: HealthSuggestionsInputSchema},
    output: {schema: HealthSuggestionsOutputSchema},
    prompt: `You are an AI assistant providing health suggestions based on medical records.

  Based on the following information, provide a list of potential health interventions and the rationale behind each suggestion.

  Mother's Consultation Records: {{{motherConsultationRecords}}}
  Maternity History: {{{maternityHistory}}}
  Baby Health Records: {{{babyHealthRecords}}}

  Format your response as a JSON array of objects, each with an "intervention" and "rationale" field.
  `,
  });

  const healthSuggestionsFlow = ai.defineFlow(
    {
      name: 'healthSuggestionsFlow',
      inputSchema: HealthSuggestionsInputSchema,
      outputSchema: HealthSuggestionsOutputSchema,
    },
    async (flowInput) => {
      const {output} = await prompt(flowInput);
      return output!;
    }
  );

  return healthSuggestionsFlow(input);
}
