import db from '../config/database.js';
import { fetchAllPages } from '../connectors/generic.js';
import { generateInsights } from './claudeService.js';
import { JSONPath } from 'jsonpath-plus';
import puppeteer from 'puppeteer';
import { Parser } from '@json2csv/plainjs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Execute a report for a specific client.
 */
export async function runReport({ templateId, clientId, outputTypes = ['pdf'], recipients = [] }) {
  // Create run record
  const runResult = await db.query(
    `INSERT INTO report_runs (template_id, client_id, triggered_by, status, started_at)
     VALUES ($1, $2, 'manual', 'running', NOW()) RETURNING id`,
    [templateId, clientId]
  );
  const runId = runResult.rows[0].id;

  try {
    // Load template
    const tplResult = await db.query('SELECT * FROM report_templates WHERE id = $1', [templateId]);
    const template = tplResult.rows[0];
    if (!template) throw new Error('Template not found');

    // Load client
    const clientResult = await db.query('SELECT * FROM clients WHERE id = $1', [clientId]);
    const client = clientResult.rows[0];
    if (!client) throw new Error('Client not found');

    const columns = template.column_layout;
    const filters = template.filters || [];
    const settings = template.settings || {};

    // Group columns by connector
    const connectorGroups = {};
    for (const col of columns) {
      if (!connectorGroups[col.connectorId]) {
        connectorGroups[col.connectorId] = [];
      }
      connectorGroups[col.connectorId].push(col);
    }

    // Fetch data from each connector
    const datasets = {};
    for (const [connectorId, cols] of Object.entries(connectorGroups)) {
      const connResult = await db.query('SELECT * FROM connectors WHERE id = $1', [connectorId]);
      const connector = connResult.rows[0];

      const credResult = await db.query(
        'SELECT credentials_encrypted FROM client_credentials WHERE client_id = $1 AND connector_id = $2',
        [clientId, connectorId]
      );

      if (!credResult.rows[0]) {
        throw new Error(`No credentials for connector ${connector?.name || connectorId}`);
      }

      // Get unique endpoints
      const endpoints = [...new Set(cols.map((c) => c.endpoint).filter(Boolean))];

      for (const endpoint of endpoints) {
        const data = await fetchAllPages(connector, credResult.rows[0].credentials_encrypted, endpoint);
        datasets[`${connectorId}:${endpoint}`] = data;
      }
    }

    // Extract and merge fields
    let rows = buildRows(columns, datasets, filters, settings);

    // Generate AI insights if enabled
    let insightsText = null;
    const insightsEnabled = settings.includeInsights !== false;
    if (insightsEnabled) {
      try {
        insightsText = await generateInsights(rows, client.name, template.name);
      } catch (err) {
        console.error('AI insights generation failed:', err.message);
      }
    }

    // Generate outputs
    const outputUrls = {};

    if (outputTypes.includes('pdf')) {
      const pdfBuffer = await renderPdf(template, client, rows, columns, insightsText);
      // In production, upload to S3 and store signed URL
      // For now, store locally
      const fs = await import('fs/promises');
      const outputDir = join(__dirname, '../../reports-output');
      await fs.mkdir(outputDir, { recursive: true });
      const pdfPath = join(outputDir, `${runId}.pdf`);
      await fs.writeFile(pdfPath, pdfBuffer);
      outputUrls.pdf = `/api/runs/${runId}/download?type=pdf`;
    }

    if (outputTypes.includes('csv')) {
      const csvContent = renderCsv(rows, columns);
      const fs = await import('fs/promises');
      const outputDir = join(__dirname, '../../reports-output');
      await fs.mkdir(outputDir, { recursive: true });
      const csvPath = join(outputDir, `${runId}.csv`);
      await fs.writeFile(csvPath, csvContent);
      outputUrls.csv = `/api/runs/${runId}/download?type=csv`;
    }

    // Send email if requested
    if (outputTypes.includes('email') && recipients.length > 0) {
      await sendReportEmail(template, client, recipients, outputUrls, insightsText);
    }

    // Update run record
    await db.query(
      `UPDATE report_runs SET status = 'success', output_urls = $1, insights_text = $2, completed_at = NOW()
       WHERE id = $3`,
      [JSON.stringify(outputUrls), insightsText, runId]
    );

    return { runId, status: 'success', outputUrls };
  } catch (err) {
    await db.query(
      `UPDATE report_runs SET status = 'failed', error_message = $1, completed_at = NOW() WHERE id = $2`,
      [err.message, runId]
    );
    throw err;
  }
}

function buildRows(columns, datasets, filters, settings) {
  // Simple implementation: extract fields from datasets and build tabular rows
  // In a full implementation, this would JOIN across connectors on identity keys
  const rows = [];

  // Find the primary dataset (first one with data)
  const firstKey = Object.keys(datasets)[0];
  if (!firstKey) return rows;

  const primaryData = datasets[firstKey];
  if (!Array.isArray(primaryData)) return rows;

  for (const item of primaryData) {
    const row = {};
    for (const col of columns) {
      const key = `${col.connectorId}:${col.endpoint}`;
      const dataSource = datasets[key] || primaryData;

      if (col.jsonPath) {
        const result = JSONPath({ path: col.jsonPath, json: item });
        row[col.fieldId] = result?.[0] ?? null;
      } else {
        row[col.fieldId] = item[col.fieldName] ?? null;
      }
    }
    rows.push(row);
  }

  // Apply filters
  const filtered = rows.filter((row) => {
    for (const filter of filters) {
      const value = row[filter.fieldId];
      switch (filter.operator) {
        case 'equals': if (String(value) !== String(filter.value)) return false; break;
        case 'not_equals': if (String(value) === String(filter.value)) return false; break;
        case 'contains': if (!String(value).includes(filter.value)) return false; break;
        case 'greater_than': if (Number(value) <= Number(filter.value)) return false; break;
        case 'less_than': if (Number(value) >= Number(filter.value)) return false; break;
        case 'is_empty': if (value != null && value !== '') return false; break;
      }
    }
    return true;
  });

  // Apply sorting
  if (settings.sortBy) {
    filtered.sort((a, b) => {
      const va = a[settings.sortBy] ?? '';
      const vb = b[settings.sortBy] ?? '';
      return String(va).localeCompare(String(vb));
    });
  }

  // Apply max rows
  const maxRows = settings.maxRows || 1000;
  return filtered.slice(0, maxRows);
}

async function renderPdf(template, client, rows, columns, insightsText) {
  const html = buildReportHtml(template, client, rows, columns, insightsText);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '40px', right: '40px', bottom: '40px', left: '40px' },
      printBackground: true,
    });
    return pdf;
  } finally {
    await browser.close();
  }
}

function buildReportHtml(template, client, rows, columns, insightsText) {
  const colHeaders = columns.map((c) => `<th style="padding:8px 12px;text-align:left;border-bottom:2px solid #1e2840;color:#8892a4;font-size:11px;text-transform:uppercase;letter-spacing:0.05em">${c.label || c.displayLabel || c.fieldName}</th>`).join('');

  const dataRows = rows.map((row) => {
    const cells = columns.map((c) => {
      const val = row[c.fieldId] ?? row[c.fieldName] ?? '—';
      return `<td style="padding:8px 12px;border-bottom:1px solid #1e284022;font-size:12px">${val}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  const insightsHtml = insightsText
    ? `<div style="margin-top:32px;padding:20px;background:#00d4ff08;border:1px solid #00d4ff22;border-radius:8px">
        <h3 style="color:#00d4ff;font-size:13px;margin-bottom:12px">AI Insights</h3>
        <div style="color:#8892a4;font-size:12px;line-height:1.7;white-space:pre-wrap">${insightsText}</div>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: #e2e8f0; background: #0a0d12; margin: 0; padding: 40px; }
  table { width: 100%; border-collapse: collapse; }
</style></head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;padding-bottom:16px;border-bottom:2px solid #1e2840">
    <div>
      <h1 style="font-size:20px;margin:0 0 4px;color:#e2e8f0">${template.name}</h1>
      <p style="font-size:12px;color:#8892a4;margin:0">${template.description || ''}</p>
    </div>
    <div style="text-align:right">
      <div style="font-size:14px;font-weight:700;color:#00d4ff">${client.name}</div>
      <div style="font-size:11px;color:#8892a4">${new Date().toLocaleDateString()}</div>
    </div>
  </div>
  <table>
    <thead><tr>${colHeaders}</tr></thead>
    <tbody>${dataRows}</tbody>
  </table>
  <div style="margin-top:16px;font-size:11px;color:#4a5568">${rows.length} rows returned</div>
  ${insightsHtml}
  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #1e2840;font-size:10px;color:#4a5568;text-align:center">
    Generated by NexusMSP | ${new Date().toISOString()}
  </div>
</body>
</html>`;
}

function renderCsv(rows, columns) {
  const fields = columns.map((c) => ({
    label: c.label || c.displayLabel || c.fieldName,
    value: c.fieldId || c.fieldName,
  }));

  const parser = new Parser({ fields });
  return parser.parse(rows);
}

async function sendReportEmail(template, client, recipients, outputUrls, insightsText) {
  // Dynamic import to allow the app to work without email configured
  const nodemailer = await import('nodemailer');

  const transporter = nodemailer.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    auth: {
      user: process.env.SMTP_USER || 'apikey',
      pass: process.env.SENDGRID_API_KEY || process.env.SMTP_PASS,
    },
  });

  const subject = `${template.name} — ${client.name} — ${new Date().toLocaleDateString()}`;

  const attachments = [];
  const fs = await import('fs');
  const { join } = await import('path');

  for (const [type, url] of Object.entries(outputUrls)) {
    const runId = url.split('/').find((_, i, arr) => arr[i - 1] === 'runs');
    if (runId) {
      const filePath = join(__dirname, '../../reports-output', `${runId}.${type}`);
      if (fs.existsSync(filePath)) {
        attachments.push({
          filename: `${template.name.replace(/[^a-zA-Z0-9]/g, '_')}.${type}`,
          path: filePath,
        });
      }
    }
  }

  await transporter.sendMail({
    from: process.env.FROM_EMAIL || 'reports@nexusmsp.local',
    to: recipients.join(', '),
    subject,
    html: `<p>Your scheduled report <strong>${template.name}</strong> for <strong>${client.name}</strong> is ready.</p>
           ${insightsText ? `<h3>AI Insights</h3><pre>${insightsText}</pre>` : ''}
           <p style="color:#888;font-size:12px">Generated by NexusMSP</p>`,
    attachments,
  });
}
