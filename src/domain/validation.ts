export type ValidationType = 'chain' | 'block' | 'transaction' | 'node'
export type ValidationStatus = 'valid' | 'invalid' | 'error'

export interface ValidationEvent {
  id: string
  type: ValidationType
  status: ValidationStatus
  target: string
  message: string
  timestamp: string
}
