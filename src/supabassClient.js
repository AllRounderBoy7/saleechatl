import { SUPABASE_URL, SUPABASE_KEY } from './config';

// 🛠️ Supabase Client (Simple fetch-based)
class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
  }

  async request(table, method = 'GET', body = null, filters = '') {
    const endpoint = `${this.url}/rest/v1/${table}${filters}`;
    
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.key,
          'Authorization': `Bearer ${this.key}`
        }
      };

      if (body) options.body = JSON.stringify(body);

      const response = await fetch(endpoint, options);
      
      if (!response.ok) {
        const error = await response.json();
        throw error;
      }

      return await response.json();
    } catch (error) {
      console.error('Supabase Error:', error);
      return null;
    }
  }

  async select(table, filters = '') {
    return this.request(table, 'GET', null, filters);
  }

  async insert(table, data) {
    return this.request(table, 'POST', data);
  }

  async update(table, data, filters) {
    return this.request(table, 'PATCH', data, filters);
  }

  async delete(table, filters) {
    return this.request(table, 'DELETE', null, filters);
  }
}

// Client instance banakar export karein
export const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_KEY);
