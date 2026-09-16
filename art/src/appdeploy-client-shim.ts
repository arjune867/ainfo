type ApiResponse<T = any> = { data: T };

type AuthUser = {
  userId: string;
  email?: string;
  name?: string;
  picture?: string;
  scope: string;
};

const request = async <T = any>(method: string, url: string, body?: unknown): Promise<ApiResponse<T>> => {
  const response = await fetch(url, {
    method,
    credentials: 'include',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    const message = typeof data === 'object' && data?.error ? String(data.error) : `HTTP ${response.status}`;
    const error = new Error(message) as Error & { status?: number; code?: string };
    error.status = response.status;
    if (response.status === 401) error.code = 'not_authenticated';
    throw error;
  }
  return { data: data as T };
};

export const api = {
  get: <T = any>(url: string) => request<T>('GET', url),
  post: <T = any>(url: string, body?: unknown) => request<T>('POST', url, body),
  put: <T = any>(url: string, body?: unknown) => request<T>('PUT', url, body),
  delete: <T = any>(url: string, body?: unknown) => request<T>('DELETE', url, body),
};

export const auth = {
  async getUser(): Promise<AuthUser | null> {
    try {
      const result = await request<AuthUser>('GET', '/api/me');
      return result.data;
    } catch (error) {
      const failure = error as { status?: number };
      if (failure.status === 401) return null;
      throw error;
    }
  },
  async signIn(_options?: unknown): Promise<{ user: AuthUser }> {
    const current = await auth.getUser();
    if (current) return { user: current };
    const error = new Error('Cloudflare Access authentication required') as Error & { code?: string };
    error.code = 'not_authenticated';
    throw error;
  },
  async signOut(): Promise<void> {
    window.location.assign('/cdn-cgi/access/logout');
  },
};
