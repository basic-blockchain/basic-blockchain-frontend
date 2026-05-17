import client from './client'

export interface RegisterResponse {
  user_id: string
  username: string
  activation_code: string
  message: string
}

export interface ActivateResponse {
  message: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export interface MeResponse {
  user_id: string
  username: string
  display_name: string
  roles: string[]
  banned: boolean
  created_at: string
  kyc_level?: 'L0' | 'L1' | 'L2' | 'L3'
}

export async function register(
  username: string,
  displayName: string,
  country?: string,
): Promise<RegisterResponse> {
  const body: Record<string, string> = {
    username,
    display_name: displayName,
  }
  // Backend validates this as a 2-letter ISO 3166-1 alpha-2 code and
  // rejects anything else with VALIDATION_ERROR; only forward the
  // field when the user actually picked one.
  if (country) body.country = country
  const { data } = await client.post<RegisterResponse>('/auth/register', body)
  return data
}

export async function activate(
  username: string,
  activationCode: string,
  password: string
): Promise<ActivateResponse> {
  const { data } = await client.post<ActivateResponse>('/auth/activate', {
    username,
    activation_code: activationCode,
    password,
  })
  return data
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const { data } = await client.post<LoginResponse>('/auth/login', { username, password })
  return data
}

export async function me(): Promise<MeResponse> {
  const { data } = await client.get<MeResponse>('/auth/me')
  return data
}
