import Anthropic from '@anthropic-ai/sdk';
import db from '../config/database.js';

let client;

function getClient() {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

async function getModel() {
  const result = await db.query(
    "SELECT value FROM platform_settings WHERE key = 'ai_model'"
  );
  return result.rows[0]?.value?.replace(/"/g, '') || 'claude-sonnet-4-20250514';
}

async function getMaxTokens() {
  const result = await db.query(
    "SELECT value FROM platform_settings WHERE key = 'ai_max_tokens'"
  );
  return parseInt(result.rows[0]?.value || '4096', 10);
}

/**
 * Discover API fields from documentation text or sample JSON responses.
 * Sends the content to Claude and returns a structured field catalog.
 */
export async function discoverFields(apiDocsText, sampleJson, baseUrl) {
  const anthropic = getClient();
  const model = await getModel();
  const maxTokens = await getMaxTokens();

  const inputParts = [];
  if (apiDocsText) inputParts.push(`API Documentation:\n${apiDocsText}`);
  if (sampleJson) inputParts.push(`Sample JSON Response:\n${JSON.stringify(sampleJson, null, 2)}`);
  if (baseUrl) inputParts.push(`Base URL: ${baseUrl}`);

  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    messages: [
      {
        role: 'user',
        content: `You are an API analysis expert. Analyze the following API information and extract all available data fields.

${inputParts.join('\n\n')}

Return a JSON array of discovered fields. Each field object must have:
- name: the API field name (camelCase)
- displayLabel: human-readable label
- dataType: one of "string", "number", "boolean", "datetime", "date", "array"
- endpoint: the API endpoint path where this field is found
- description: brief description of the field
- jsonPath: JSONPath expression to extract this field from the response

Return ONLY the JSON array, no other text.`,
      },
    ],
  });

  const text = response.content[0].text.trim();
  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Claude did not return valid JSON field array');
  }
  return JSON.parse(jsonMatch[0]);
}

/**
 * Convert a natural language query into report column selections and filters.
 */
export async function nlQueryToColumns(query, availableFields) {
  const anthropic = getClient();
  const model = await getModel();

  const fieldList = availableFields.map((f) =>
    `- ${f.field_name} (${f.display_label}, type: ${f.data_type}, connector: ${f.connector_name})`
  ).join('\n');

  const response = await anthropic.messages.create({
    model,
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `You are a report builder assistant. Given a natural language description, select the most relevant fields and create filters.

Available fields:
${fieldList}

User request: "${query}"

Return a JSON object with:
- columns: array of field_name strings to include as columns
- filters: array of { field_name, operator, value } objects where operator is one of: equals, not_equals, contains, greater_than, less_than, is_empty, older_than_days

Return ONLY the JSON object, no other text.`,
      },
    ],
  });

  const text = response.content[0].text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Claude did not return valid JSON');
  }
  return JSON.parse(jsonMatch[0]);
}

/**
 * Generate executive insights from report data.
 */
export async function generateInsights(reportData, clientName, reportName) {
  const anthropic = getClient();
  const model = await getModel();
  const maxTokens = await getMaxTokens();

  // Limit data sent to Claude to avoid excessive tokens
  const sample = Array.isArray(reportData) ? reportData.slice(0, 100) : reportData;

  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    messages: [
      {
        role: 'user',
        content: `You are an MSP reporting analyst. Analyze the following report data and provide executive insights.

Report: ${reportName}
Client: ${clientName}
Data (${Array.isArray(reportData) ? reportData.length : 'N/A'} rows):
${JSON.stringify(sample, null, 2)}

Provide:
1. Key findings (2-4 bullet points)
2. Anomalies or concerns (if any)
3. Recommendations (1-3 actionable items)
4. Trend comparison note (if data suggests trends)

Format as clean markdown suitable for a PDF report appendix.`,
      },
    ],
  });

  return response.content[0].text;
}

/**
 * Suggest additional fields that would complement the current report columns.
 */
export async function suggestFields(currentColumns, allFields) {
  const anthropic = getClient();
  const model = await getModel();

  const currentNames = currentColumns.map((c) => c.field_name).join(', ');
  const allNames = allFields.map((f) =>
    `${f.field_name} (${f.display_label}, ${f.data_type})`
  ).join('\n');

  const response = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Current report columns: ${currentNames}

All available fields:
${allNames}

Suggest 3-5 additional fields that would complement this report. Return a JSON array of field_name strings. Return ONLY the JSON array.`,
      },
    ],
  });

  const text = response.content[0].text.trim();
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
}
