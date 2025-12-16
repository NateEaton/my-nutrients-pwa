/*
 * My Calcium Tracker PWA
 * Copyright (C) 2025 Nathan A. Eaton Jr.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * Cloudflare Worker for cross-device sync using KV storage.
 * Handles encrypted data synchronization with CORS support.
 */

interface Env {
  // MATCHES TOML BINDING: binding = "NUTRIENTS_SYNC_KV"
  NUTRIENTS_SYNC_KV: KVNamespace; 
  ALLOWED_ORIGINS?: string;
}

interface SyncRequest {
  docId: string;
  encrypted: string;
}

interface SyncResponse {
  success: boolean;
  docId?: string;
  encrypted?: string;
  lastModified?: string;
  error?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Parse CORS origins or use your specific defaults
    const allowedOrigins = env.ALLOWED_ORIGINS
      ? env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
      : [
          'https://nutri.eatonfamily.net',
          'https://nutri-dev.eatonfamily.net',
          // Local development defaults
          'http://localhost:5173',
          'http://127.0.0.1:5173'
        ];

    const origin = request.headers.get('Origin');
    const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, PUT, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Last-Modified',
      'Access-Control-Expose-Headers': 'X-Last-Modified',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/ping') {
        return Response.json({ success: true, message: 'My Nutrients sync worker is running' }, { headers: corsHeaders });
      }

      const docMatch = path.match(/^\/sync\/([a-zA-Z0-9-]+)$/);
      if (!docMatch) {
        return Response.json({ success: false, error: 'Invalid endpoint' }, { status: 404, headers: corsHeaders });
      }

      const docId = docMatch[1];
      const kvKey = `doc:${docId}`;

      // --- GET REQUEST ---
      if (request.method === 'GET') {
        // Use NUTRIENTS_SYNC_KV
        const stored = await env.NUTRIENTS_SYNC_KV.get(kvKey, { type: 'json' });
        if (!stored) {
          return Response.json({ success: false, error: 'Document not found' }, { status: 404, headers: corsHeaders });
        }
        const response: SyncResponse = { 
            success: true, 
            docId, 
            encrypted: (stored as any).encrypted, 
            lastModified: (stored as any).lastModified 
        };
        return Response.json(response, { headers: corsHeaders });
      }

      // --- PUT REQUEST ---
      if (request.method === 'PUT') {
        const body: SyncRequest = await request.json();
        if (!body.encrypted) {
          return Response.json({ success: false, error: 'Missing encrypted data' }, { status: 400, headers: corsHeaders });
        }
        const lastModified = new Date().toISOString();
        const storeData = { encrypted: body.encrypted, lastModified, docId };

        // Use NUTRIENTS_SYNC_KV
        await env.NUTRIENTS_SYNC_KV.put(kvKey, JSON.stringify(storeData), {
          metadata: { lastModified },
        });

        const response: SyncResponse = { success: true, docId, lastModified };
        return Response.json(response, { headers: corsHeaders });
      }

      // --- HEAD REQUEST ---
      if (request.method === 'HEAD') {
        // Use NUTRIENTS_SYNC_KV
        const stored = await env.NUTRIENTS_SYNC_KV.getWithMetadata(kvKey);
        if (!stored?.metadata) {
          return new Response(null, { status: 404, headers: corsHeaders });
        }

        const metadata = stored.metadata as { lastModified?: string };
        const lastModified = metadata.lastModified;

        if (!lastModified) {
          console.error(`Worker HEAD Error: Metadata found for key ${kvKey} but lastModified is missing.`);
          return new Response(null, { status: 404, headers: corsHeaders });
        }
        
        const responseHeaders = new Headers(corsHeaders);
        responseHeaders.set('X-Last-Modified', lastModified);
        return new Response(null, { status: 200, headers: responseHeaders });
      }

      return Response.json({ success: false, error: 'Method not allowed' }, { status: 405, headers: corsHeaders });

    } catch (error) {
      console.error('Worker error:', error);
      return Response.json({ success: false, error: 'Internal server error' }, { status: 500, headers: corsHeaders });
    }
  },
};