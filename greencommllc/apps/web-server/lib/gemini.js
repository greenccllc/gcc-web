const { GoogleGenerativeAI } = require('@google/generative-ai');

const DEFAULT_EXTRACT_MODEL = process.env.GEMINI_EXTRACT_MODEL || 'gemini-2.5-flash';
const DEFAULT_STYLE_MODEL = process.env.GEMINI_STYLE_MODEL || 'gemini-2.5-flash';

function getClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('gemini_not_configured');
  return new GoogleGenerativeAI(key);
}

function isConfigured() {
  return !!process.env.GEMINI_API_KEY;
}

// Quick health check — does the API key work and the model respond?
async function ping() {
  const ai = getClient();
  const model = ai.getGenerativeModel({ model: DEFAULT_EXTRACT_MODEL });
  const res = await model.generateContent('reply with the single word: ok');
  return res.response.text().trim();
}

// Extract structured info from a file. Returns whatever JSON shape the
// instructions ask for; caller is responsible for matching it to a schema.
async function extractFromFile({ buffer, mimeType, instructions, schema }) {
  const ai = getClient();
  const model = ai.getGenerativeModel({
    model: DEFAULT_EXTRACT_MODEL,
    generationConfig: schema
      ? { responseMimeType: 'application/json', responseSchema: schema }
      : { responseMimeType: 'application/json' },
  });

  const res = await model.generateContent([
    { inlineData: { data: buffer.toString('base64'), mimeType } },
    {
      text:
        instructions ||
        'Extract structured data from this document. Return strict JSON. Use null for missing fields.',
    },
  ]);
  const text = res.response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

// Take a content draft and return polished, on-brand HTML for a customer.
async function stylize({ content, instructions, voice }) {
  const ai = getClient();
  const model = ai.getGenerativeModel({
    model: DEFAULT_STYLE_MODEL,
    systemInstruction:
      'You output HTML ONLY. No prose, no commentary, no markdown fences. Begin your response with <!DOCTYPE html> or <html or <style. Do not explain anything.',
  });

  const prompt = [
    instructions ||
      'Restyle this HTML using the theme spec. Preserve all facts, numbers, and structure. Replace inline styles with theme-appropriate ones. Return a complete standalone HTML document with embedded <style>.',
    voice && `THEME SPEC:\n${voice}`,
    `INPUT HTML:\n${content}`,
    'OUTPUT (HTML only, no fences, no prose):',
  ]
    .filter(Boolean)
    .join('\n\n---\n\n');

  const res = await model.generateContent(prompt);
  return extractHtml(res.response.text());
}

// Gemini sometimes wraps HTML/JSON in ```html ... ``` fences. Strip them.
function stripCodeFence(s) {
  if (!s) return s;
  const trimmed = s.trim();
  const m = trimmed.match(/^```(?:html|HTML|json)?\s*\n([\s\S]*?)\n?```$/);
  return m ? m[1].trim() : trimmed;
}

// Pull HTML out of a response that may include a code fence and surrounding prose.
// Falls back to the cleaned full text if no fence or doctype is found.
function extractHtml(s) {
  if (!s) return s;
  const fenceMatch = s.match(/```(?:html|HTML)?\s*\n([\s\S]*?)\n```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const doctypeIdx = s.search(/<!DOCTYPE\s+html/i);
  if (doctypeIdx >= 0) return s.slice(doctypeIdx).trim();
  const htmlIdx = s.search(/<html[\s>]/i);
  if (htmlIdx >= 0) return s.slice(htmlIdx).trim();
  return s.trim();
}

module.exports = { getClient, isConfigured, ping, extractFromFile, stylize };
