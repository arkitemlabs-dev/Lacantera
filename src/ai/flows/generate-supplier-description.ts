'use server';

/**
 * @fileOverview This file defines a Genkit flow to generate a supplier description based on uploaded documents.
 *
 * The flow takes document data URIs as input and returns a generated supplier description.
 * It exports:
 *   - `generateSupplierDescription`: The main function to trigger the flow.
 *   - `GenerateSupplierDescriptionInput`: The input type for the flow.
 *   - `GenerateSupplierDescriptionOutput`: The output type for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the input schema
const GenerateSupplierDescriptionInputSchema = z.object({
  documentDataUris: z
    .array(z.string())
    .describe(
      'An array of document data URIs that must include a MIME type and use Base64 encoding. Expected format: data:<mimetype>;base64,<encoded_data>.'
    ),
});
export type GenerateSupplierDescriptionInput = z.infer<
  typeof GenerateSupplierDescriptionInputSchema
>;

// Define the output schema
const GenerateSupplierDescriptionOutputSchema = z.object({
  description: z
    .string()
    .describe('A brief, AI-generated description of the supplier.'),
});
export type GenerateSupplierDescriptionOutput = z.infer<
  typeof GenerateSupplierDescriptionOutputSchema
>;

// Define the main function
export async function generateSupplierDescription(
  input: GenerateSupplierDescriptionInput
): Promise<GenerateSupplierDescriptionOutput> {
  return generateSupplierDescriptionFlow(input);
}

// Define the prompt
const generateSupplierDescriptionPrompt = ai.definePrompt({
  name: 'generateSupplierDescriptionPrompt',
  input: {schema: GenerateSupplierDescriptionInputSchema},
  output: {schema: GenerateSupplierDescriptionOutputSchema},
  prompt: `You are an AI assistant tasked with generating a concise supplier description based on uploaded documents.

  Analyze the following documents to identify key aspects of the supplier, such as their industry, products or services offered, and any unique selling points.
  Provide a short and engaging description that highlights the supplier's strengths and relevance.

  Documents:
  {{#each documentDataUris}}
  Document {{@index}}: {{media url=this}}
  {{/each}}
  `,
});

// Define the flow
const generateSupplierDescriptionFlow = ai.defineFlow(
  {
    name: 'generateSupplierDescriptionFlow',
    inputSchema: GenerateSupplierDescriptionInputSchema,
    outputSchema: GenerateSupplierDescriptionOutputSchema,
  },
  async input => {
    const {output} = await generateSupplierDescriptionPrompt(input);
    return output!;
  }
);

