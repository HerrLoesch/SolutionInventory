#!/usr/bin/env node

/**
 * MCP Bridge für SolutionInventory
 * Verbindet VS Code's MCP-Client via stdin/stdout mit dem .NET-Server über HTTP/SSE
 */

const http = require('http');
const https = require('https');
const readline = require('readline');

const SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:5100';
let sessionId = null;

// ──────────────────────────────────────────────────────────────────────────────
// JSON-RPC Helper
// ──────────────────────────────────────────────────────────────────────────────

function sendJsonRpc(message) {
  process.stdout.write(JSON.stringify(message) + '\n');
}

function createResponse(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function createError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

// ──────────────────────────────────────────────────────────────────────────────
// HTTP Helpers
// ──────────────────────────────────────────────────────────────────────────────

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(SERVER_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: { raw: data } });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// MCP Initialize
// ──────────────────────────────────────────────────────────────────────────────

async function handleInitialize(params, id) {
  try {
    sessionId = `session-${Date.now()}`;
    
    const result = {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {}
      },
      serverInfo: {
        name: 'SolutionInventory',
        version: '1.0.0'
      }
    };

    sendJsonRpc(createResponse(id, result));
  } catch (err) {
    sendJsonRpc(createError(id, -32603, err.message));
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// MCP Tools: list_tools
// ──────────────────────────────────────────────────────────────────────────────

async function handleListTools(params, id) {
  try {
    const tools = [
      {
        name: 'list_categories',
        description: 'Lists all categories in the workspace with their subcategory entries',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'list_questionnaires',
        description: 'Lists all questionnaires and their structure (categories/entries)',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'get_answers_for_category',
        description: 'Returns all answers recorded for a specific category, optionally filtered by entry or questionnaire',
        inputSchema: {
          type: 'object',
          properties: {
            categoryId: {
              type: 'string',
              description: 'The ID of the category to filter answers for'
            },
            entryId: {
              type: 'string',
              description: 'Optional: Filter to a specific entry ID within the category'
            },
            questionnaireId: {
              type: 'string',
              description: 'Optional: Filter to a specific questionnaire ID'
            }
          },
          required: ['categoryId']
        }
      },
      {
        name: 'get_tech_radar',
        description: 'Returns the technology radar data (overrides, refs, and category order)',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'evaluate_responses',
        description: 'Evaluates response quality of a questionnaire. Returns consistency_score (0.0-1.0), completeness_% (0-100), and a warnings array with detected issues.',
        inputSchema: {
          type: 'object',
          properties: {
            questionnaire_id: {
              type: 'string',
              description: 'The unique identifier (ID or name) of the questionnaire to evaluate.'
            }
          },
          required: ['questionnaire_id']
        }
      },
      {
        name: 'get_json_schema',
        description: 'Returns a JSON Schema (Draft-07) document describing a SolutionInventory data format. Use "workspace" to get the schema for the complete workspace export file (project + questionnaires, including all valid category IDs, entry IDs, and enum values). Use "questionnaire" to get the schema for a single standalone questionnaire document.',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'The schema to retrieve: "workspace" (full export with project + questionnaires) or "questionnaire" (single questionnaire document).',
              enum: ['workspace', 'questionnaire']
            }
          },
          required: ['type']
        }
      }
    ];

    sendJsonRpc(createResponse(id, { tools }));
  } catch (err) {
    sendJsonRpc(createError(id, -32603, err.message));
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// MCP Tools: call_tool
// ──────────────────────────────────────────────────────────────────────────────

async function handleCallTool(params, id) {
  try {
    const { name, arguments: args } = params;

    // POST directly to the stateless /api/tool/call endpoint – no SSE session required
    const response = await makeRequest('/api/tool/call', 'POST',
      JSON.stringify({ name, arguments: args || {} }));

    if (response.status !== 200) {
      sendJsonRpc(createError(id, -32603, `Tool call failed with status ${response.status}`));
      return;
    }

    // The .NET server returns { content: [{ type: 'text', text: '...' }] }
    sendJsonRpc(createResponse(id, {
      content: response.data.content || [{ type: 'text', text: 'No response from tool' }]
    }));
  } catch (err) {
    sendJsonRpc(createError(id, -32603, err.message));
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Main: stdin/stdout JSON-RPC loop
// ──────────────────────────────────────────────────────────────────────────────

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', async (line) => {
  if (!line.trim()) return;

  try {
    const message = JSON.parse(line);
    const { jsonrpc, method, params, id } = message;

    if (jsonrpc !== '2.0') {
      sendJsonRpc(createError(id, -32600, 'Invalid JSON-RPC version'));
      return;
    }

    // Notifications have no id – they must not receive a response
    if (id === undefined || id === null) return;

    switch (method) {
      case 'initialize':
        await handleInitialize(params, id);
        break;
      case 'tools/list':
        await handleListTools(params, id);
        break;
      case 'tools/call':
        await handleCallTool(params, id);
        break;
      case 'ping':
        sendJsonRpc(createResponse(id, {}));
        break;
      default:
        sendJsonRpc(createError(id, -32601, `Unknown method: ${method}`));
    }
  } catch (err) {
    console.error('JSON-RPC Error:', err.message);
  }
});

rl.on('close', () => {
  process.exit(0);
});

process.on('error', (err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
