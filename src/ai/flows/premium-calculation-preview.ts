'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a premium calculation summary based on user inputs.
 *
 * It exports:
 * - `calculatePremiumSummary`: An async function that takes `PremiumCalculationInput` and returns a `PremiumCalculationOutput`.
 * - `PremiumCalculationInput`: The input type for the premium calculation, including coverage details and user preferences.
 * - `PremiumCalculationOutput`: The output type, providing a summary of the premium calculation with potential notes.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the input schema for the premium calculation
const PremiumCalculationInputSchema = z.object({
  coverageAmount: z.number().describe('The total coverage amount.'),
  coveragePeriod: z.number().describe('The coverage period in years.'),
  userAge: z.number().describe('The age of the user.'),
  riders: z.array(z.string()).describe('A list of selected riders.'),
});
export type PremiumCalculationInput = z.infer<typeof PremiumCalculationInputSchema>;

// Define the output schema for the premium calculation summary
const PremiumCalculationOutputSchema = z.object({
  summary: z.string().describe('A summary of the premium calculation.'),
  note: z.string().optional().describe('An optional note providing additional information or caveats.'),
});
export type PremiumCalculationOutput = z.infer<typeof PremiumCalculationOutputSchema>;


const addNoteTool = ai.defineTool(
  {
    name: 'addNote',
    description: 'Adds a note to the premium summary if necessary, for example, if the user is older than 60.',
    inputSchema: z.object({
      userAge: z.number().describe('The age of the user.'),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    if (input.userAge > 60) {
      return 'Note: Premiums may be higher for users over 60 due to increased risk.';
    } else {
      return '';
    }
  }
);

// Define the prompt for generating the premium calculation summary
const premiumCalculationPrompt = ai.definePrompt({
  name: 'premiumCalculationPrompt',
  input: {schema: PremiumCalculationInputSchema},
  output: {schema: PremiumCalculationOutputSchema},
  tools: [addNoteTool],
  prompt: `You are an insurance premium calculator. Based on the following information, generate a summary of the premium calculation. Use the addNote tool if necessary.\n\nCoverage Amount: {{{coverageAmount}}}\nCoverage Period: {{{coveragePeriod}}} years\nUser Age: {{{userAge}}}\nRiders: {{#each riders}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}\n\nSummary:`, 
  system: `You are an expert at summarizing insurance premiums. You must use the addNote tool to add a note if the user is older than 60. The addNote tool should only be used if absolutely necessary.`
});

// Define the Genkit flow for calculating the premium summary
const calculatePremiumFlow = ai.defineFlow(
  {
    name: 'calculatePremiumFlow',
    inputSchema: PremiumCalculationInputSchema,
    outputSchema: PremiumCalculationOutputSchema,
  },
  async input => {
    const {output} = await premiumCalculationPrompt(input);
    return output!;
  }
);

/**
 * Calculates the premium summary based on the provided input.
 * @param input - The input for the premium calculation.
 * @returns A promise that resolves to the premium calculation summary.
 */
export async function calculatePremiumSummary(input: PremiumCalculationInput): Promise<PremiumCalculationOutput> {
  return calculatePremiumFlow(input);
}
