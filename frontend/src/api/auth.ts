import { apiFetch } from './client'

export interface User {
  id: string
  email: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
}

export const authApi = {
  login: (body: LoginRequest) =>
    apiFetch<User>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  register: (body: RegisterRequest) =>
    apiFetch<void>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  logout: () =>
    apiFetch<void>('/auth/logout', { method: 'POST' }),

  me: () =>
    apiFetch<User>('/auth/me'),
}
