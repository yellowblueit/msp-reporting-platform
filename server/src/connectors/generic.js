import { decrypt } from '../services/encryption.js';

/**
 * Generic REST connector — fetches data from any API using stored credentials.
 * Connector plugins in this directory can override behavior for specific APIs.
 */
export async function fetchData(connector, credentials, endpoint, params = {}) {
  const creds = JSON.parse(decrypt(credentials));
  const url = new URL(endpoint, connector.base_url);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const headers = buildAuthHeaders(connector.auth_type, creds);
  headers['Accept'] = 'application/json';

  const response = await fetch(url.toString(), { headers });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function buildAuthHeaders(authType, creds) {
  switch (authType) {
    case 'apikey':
      return { [creds.headerName || 'X-API-Key']: creds.apiKey };
    case 'bearer':
      return { Authorization: `Bearer ${creds.token}` };
    case 'basic': {
      const encoded = Buffer.from(`${creds.username}:${creds.password}`).toString('base64');
      return { Authorization: `Basic ${encoded}` };
    }
    case 'oauth':
      return { Authorization: `Bearer ${creds.accessToken}` };
    default:
      return {};
  }
}

/**
 * Paginated fetch — follows next page links or offset-based pagination.
 */
export async function fetchAllPages(connector, credentials, endpoint, options = {}) {
  const { maxPages = 10, pageParam = 'page', perPageParam = 'per_page', perPage = 100 } = options;
  const allData = [];

  for (let page = 1; page <= maxPages; page++) {
    const data = await fetchData(connector, credentials, endpoint, {
      [pageParam]: page,
      [perPageParam]: perPage,
    });

    const items = Array.isArray(data) ? data : data.data || data.items || data.results || [];
    allData.push(...items);

    // Stop if we got fewer items than requested (last page)
    if (items.length < perPage) break;
  }

  return allData;
}
