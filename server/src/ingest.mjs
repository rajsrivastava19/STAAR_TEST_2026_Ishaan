import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '..', '.env') });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('ERROR: GEMINI_API_KEY environment variable is missing.');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

async function uploadToGemini(filePath, mimeType) {
  console.log(`Uploading ${path.basename(filePath)} to Gemini...`);
  const uploadResult = await fileManager.uploadFile(filePath, {
    mimeType,
    displayName: path.basename(filePath),
  });
  const file = uploadResult.file;
  console.log(`Uploaded file ${file.displayName} as: ${file.name}`);
  return file;
}

async function waitForFileActive(file) {
  console.log(`Waiting for file processing: ${file.name}`);
  let currentFile = await fileManager.getFile(file.name);
  while (currentFile.state === 'PROCESSING') {
    process.stdout.write('.');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    currentFile = await fileManager.getFile(file.name);
  }
  console.log(`\nFile ${currentFile.name} is ready (state: ${currentFile.state})`);
  if (currentFile.state !== 'ACTIVE') {
    throw new Error(`File ${currentFile.name} failed to process.`);
  }
  return currentFile;
}

const SYSTEM_INSTRUCTION = `
You are an expert educational data normalizer.
Your goal is to parse three STAAR Math 3rd Grade PDF documents (Test, Answer Key, and Rationales) and combine them into a singular normalized JSON array of questions.

The JSON schema for EACH question should exactly match this TypeScript interface:

export type Option = {
  id: string; // usually 'A', 'B', 'C', 'D' or 'F', 'G', 'H', 'J'. If missing use 'Opt1', etc.
  text: string; // The text or a descriptive caption of the option. If it's pure image, describe the image briefly.
};

export type AnswerRule =
  | { kind: 'single_choice'; correct: string }
  | { kind: 'numeric_equivalent'; canonicalValue: string; acceptedValues: string[] }
  | { kind: 'multi_select'; correct: string[] }
  | { kind: 'drag_drop'; dropZones: Record<string, string>; options: string[] }
  | { kind: 'inline_choice'; blanks: { id: string; correct: string; options: string[] }[] };

export type Question = {
  id: string; // e.g. "\${YEAR}-\${PADDED_ITEM_NUMBER}" like "2019-01"
  itemNumber: number; // e.g. 1
  itemType: 'multiple_choice' | 'griddable_numeric' | 'multi_select' | 'drag_drop' | 'inline_choice';
  stem: string; // Main question text. For inline_choice, write [BLANK_1], [BLANK_2] where the drop-downs are.
  directions?: string; // Any context above the question.
  options?: Option[]; // For multiple_choice or multi_select. For drag_drop/inline_choice, leave undefined.
  answerRule: AnswerRule; // Map the correct answer to the corresponding kind above.
  metadata: {
    reportingCategory: number;
    readinessType: string; // "Readiness" or "Supporting"
    teks: string;
    maxPoints: number;
  };
  rationale: {
    correctExplanation: string;
    incorrectOptionExplanations?: Record<string, string>; // mapping from option ID (e.g. 'A') to explanation string
    remediationTip?: string; // formulate a quick tip based on the rationale
  };
};

Return the result as a raw JSON array. DO NOT WRAP in Markdown blocks. ONLY RETURN VALID JSON.
Extract EVERY question in the test (usually 30-32 questions). Be extremely thorough.
Do not hallucinate. Use ONLY the data provided in the 3 PDFs.
`;

async function ingestYear(year) {
  console.log(`Starting ingestion for year ${year}...`);
  const prevExamsDir = path.join(repoRoot, '..', 'Previous Exam Files');
  
  // Find the files via pattern matching.
  const files = await fs.readdir(prevExamsDir);
  const yearFiles = files.filter(f => f.includes(year.toString()) && f.endsWith('.pdf'));
  
  const testFile = yearFiles.find(f => f.includes('test'));
  const keyFile = yearFiles.find(f => f.includes('key'));
  const rationaleFile = yearFiles.find(f => f.includes('rationale'));
  
  if (!keyFile || !rationaleFile) {
      console.error(`Missing Key or Rationale PDFs for year ${year}. Found:`, yearFiles);
      return;
  }

  const keyPdfPath = path.join(prevExamsDir, keyFile);
  const rationalePdfPath = path.join(prevExamsDir, rationaleFile);

  const keyUpload = await uploadToGemini(keyPdfPath, 'application/pdf');
  const rationaleUpload = await uploadToGemini(rationalePdfPath, 'application/pdf');

  let testUpload = null;
  if (testFile) {
      const testPdfPath = path.join(prevExamsDir, testFile);
      testUpload = await uploadToGemini(testPdfPath, 'application/pdf');
      await waitForFileActive(testUpload);
  }

  await waitForFileActive(keyUpload);
  await waitForFileActive(rationaleUpload);

  console.log(`Generating JSON for ${year}... This may take a few minutes.`);
  const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_INSTRUCTION
  });

  let prompt = `Here are the documents for the year ${year}. Please extract all questions.`;
  if (!testUpload) {
     prompt += ` Note: The actual Test PDF was not provided because the test was administered online. Please reconstruct the entire question stem, options, and diagrams using ONLY the rationale document, which contains the question text as a prefix to the explanations.`;
  }
  
  const contentPayload = [];
  if (testUpload) contentPayload.push({ fileData: { mimeType: testUpload.mimeType, fileUri: testUpload.uri } });
  contentPayload.push({ fileData: { mimeType: keyUpload.mimeType, fileUri: keyUpload.uri } });
  contentPayload.push({ fileData: { mimeType: rationaleUpload.mimeType, fileUri: rationaleUpload.uri } });
  contentPayload.push({ text: prompt });

  const result = await model.generateContent(contentPayload);
  
  let responseText = result.response.text();
  responseText = responseText.replace(/^\`\`\`json\s*/g, '').replace(/\`\`\`$/g, '').trim();

  let questionsArray = [];
  try {
      questionsArray = JSON.parse(responseText);
  } catch (e) {
      console.error("Failed to parse the response as JSON. Response preview:");
      console.log(responseText.substring(0, 500) + "...");
      fs.writeFile(path.join(repoRoot, 'data', 'exams', `error-${year}.txt`), responseText);
      return;
  }
  
  console.log(`Successfully extracted ${questionsArray.length} questions for ${year}.`);
  
  const manifestPath = path.join(repoRoot, 'data', 'exams', 'manifest.json');
  const manifestStr = await fs.readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestStr);
  
  const entry = manifest.years.find(y => y.year === parseInt(year));
  if (!entry) {
      console.error(`Manifest entry for ${year} not found!`);
      return;
  }
  
  const bundle = {
    id: `staar-g3-math-${year}`,
    siteTitle: manifest.siteTitle,
    displayTitle: `${year} Grade 3 Math`,
    subtitle: entry.description,
    year: entry.year,
    grade: 3,
    subject: "Math",
    generation: entry.generation,
    totalQuestions: questionsArray.length,
    sourceFiles: [testFile, keyFile, rationaleFile],
    questions: questionsArray
  };
  
  const outPath = path.join(repoRoot, 'data', 'exams', `${year}.json`);
  await fs.writeFile(outPath, JSON.stringify(bundle, null, 2));
  console.log(`Wrote ${outPath}`);
  
  // Update manifest
  entry.status = 'playable';
  entry.playableQuestionCount = questionsArray.length;
  entry.dataFile = `${year}.json`;
  
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Updated manifest.json`);
}

const targetYear = process.argv[2];
if (targetYear) {
    ingestYear(targetYear).catch(console.error);
} else {
    console.log("Usage: node server/src/ingest.mjs <year>");
}
