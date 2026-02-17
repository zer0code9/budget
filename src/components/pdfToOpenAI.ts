// src/components/pdfToOpenAI.ts
"use client";

import OpenAI from "openai";
import { getResolvedPDFJS } from 'unpdf'

/**
 * PDF → text (client) + GPT extraction
 * - Uses modern pdfjs-dist (v4/v5), no legacy paths.
 * - Creates a same-origin module worker via workerPort (no workerSrc needed).
 * - Falls back to disableWorker if worker can’t be created.
 * - Calls gpt-5-nano and returns { transactions: [...] }.
 *
 * Env required in .env.local:
 *   NEXT_PUBLIC_OPENAI_API_KEY=sk-...
 */

// let pdfjsLib: any | null = null;
// let pdfWorker: Worker | null = null;
// let workerReady = false;

// async function loadPDFJS() {
//   if (pdfjsLib) return pdfjsLib;

//   // Core lib (v4/v5 safe)
//   const lib = await import("pdfjs-dist/build/pdf");

//   // Try to provide a real Worker via workerPort (preferred)
//   if (!workerReady) {
//     try {
//       // Common v4/v5 filename
//       pdfWorker = new Worker(
//         new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url),
//         { type: "module", name: "pdfjs-worker" }
//       );
//       (lib as any).GlobalWorkerOptions.workerPort = pdfWorker as any;
//       workerReady = true;
//     } catch {
//       try {
//         // Some distros ship a minified name
//         pdfWorker = new Worker(
//           new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
//           { type: "module", name: "pdfjs-worker" }
//         );
//         (lib as any).GlobalWorkerOptions.workerPort = pdfWorker as any;
//         workerReady = true;
//       } catch {
//         workerReady = false;
//         pdfWorker = null;
//       }
//     }
//   }

//   pdfjsLib = lib;
//   return pdfjsLib;
// }

/** -------- Extract plain text from every page of a PDF -------- */
async function extractTextFromPdf(file: File, onProgress: (status: string) => void): Promise<string> {
  onProgress("Getting document...");
  const { getDocument } = await getResolvedPDFJS();
  const arrayBuffer = await file.arrayBuffer();

  const pdf = await getDocument({ data: arrayBuffer }).promise;

  onProgress("Extracting text from PDF...");

  const pages: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const text = content.items.map((it: any) => ("str" in it ? it.str : "")).join(" ");
    pages.push(text);
  }

  // Normalize whitespace & clamp prompt size
  return pages.join("\n\n").replace(/\s+/g, " ").slice(0, 200_000);
}

/** -------- OpenAI client (browser; needs NEXT_PUBLIC_OPENAI_API_KEY) -------- */
let openaiInstance: OpenAI | null = null;
function getOpenAI() {
  if (openaiInstance) return openaiInstance;
  const key = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!key) throw new Error("Missing NEXT_PUBLIC_OPENAI_API_KEY in .env.local");
  openaiInstance = new OpenAI({ apiKey: key, dangerouslyAllowBrowser: true });
  return openaiInstance;
}

export type ExtractedTransaction = {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // positive
  type: "income" | "expense";
  category?: string; // name chosen from provided categories
};

/**
 * Reads the PDF, extracts text, sends to gpt-5-nano with your category list,
 * and returns { transactions: ExtractedTransaction[] }.
 */
export async function sendPdfToOpenAI(
  file: File,
  categories: { getName: () => string }[],
  onProgress: (status: string) => void
): Promise<{ transactions: ExtractedTransaction[] }> {
  onProgress("Extracting text from PDF...");
  const statementText = await extractTextFromPdf(file, onProgress);

  onProgress("Processing uploaded data...");
  const client = getOpenAI();

  const categoryList = categories.map((c) => c.getName()).join(", ");

  const system = [
    "You are a precise extractor of bank statement transactions.",
    "Output a JSON object with property `transactions`.",
    "Each transaction must be: { date:'YYYY-MM-DD', description:string, amount:number, type:'income'|'expense', category:string }.",
    "Amounts MUST be positive numbers. Exclude headers, balances, subtotals, and running totals. Be careful when getting dates to make sure they are correct.",
    `For category, choose the closest from this list: ${categoryList}. If a transaction is adding value to your account, use the 'Income' category. If a transaction cannot be categorized, use the 'Uncategorized' category.`,
  ].join(" ");

  const user = `Statement text:\n"""${statementText}"""`;

  const res = await client.chat.completions.create({
    model: "gpt-5-nano",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" }, // strict JSON: {"transactions":[...]}
    // no temperature — gpt-5-nano only supports default (1)
  });

  onProgress("Processing response...");

  const content = res.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from model");

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Model returned invalid JSON");
  }

  onProgress("Extracting transactions from response...");

  const transactions: ExtractedTransaction[] = Array.isArray(parsed?.transactions)
    ? parsed.transactions
    : [];

  return { transactions };
}
