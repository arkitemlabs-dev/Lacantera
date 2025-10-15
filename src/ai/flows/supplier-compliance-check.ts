'use server';

/**
 * @fileOverview An AI agent for checking supplier document compliance.
 *
 * - supplierComplianceCheck - A function that handles the compliance check process.
 * - SupplierComplianceCheckInput - The input type for the supplierComplianceCheck function.
 * - SupplierComplianceCheckOutput - The return type for the supplierComplianceCheck function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SupplierComplianceCheckInputSchema = z.object({
  documentDataUri: z
    .string()
    .describe(
      "A supplier document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  documentRequirements: z.string().describe('The predefined document requirements.'),
});
export type SupplierComplianceCheckInput = z.infer<typeof SupplierComplianceCheckInputSchema>;

const SupplierComplianceCheckOutputSchema = z.object({
  isCompliant: z.boolean().describe('Whether or not the document is compliant.'),
  complianceReport: z.string().describe('A report detailing the compliance check results.'),
});
export type SupplierComplianceCheckOutput = z.infer<typeof SupplierComplianceCheckOutputSchema>;

export async function supplierComplianceCheck(input: SupplierComplianceCheckInput): Promise<SupplierComplianceCheckOutput> {
  return supplierComplianceCheckFlow(input);
}

const prompt = ai.definePrompt({
  name: 'supplierComplianceCheckPrompt',
  input: {schema: SupplierComplianceCheckInputSchema},
  output: {schema: SupplierComplianceCheckOutputSchema},
  prompt: `You are an expert compliance officer specializing in supplier document verification.\n\nYou will use the uploaded document and the provided document requirements to determine if the document is compliant. You will make a determination as to whether the document meets all requirements, and set the isCompliant output field appropriately. If the document is not compliant, provide a detailed complianceReport outlining the reasons for non-compliance.\n\nDocument Requirements: {{{documentRequirements}}}\nUploaded Document: {{media url=documentDataUri}}`,
});

const supplierComplianceCheckFlow = ai.defineFlow(
  {
    name: 'supplierComplianceCheckFlow',
    inputSchema: SupplierComplianceCheckInputSchema,
    outputSchema: SupplierComplianceCheckOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
