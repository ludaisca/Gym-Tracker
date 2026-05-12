import { api } from './client'

export interface FoodAnalysisResult {
  dish_name: string
  items: Array<{
    name: string
    kcal: number
    protein_g: number
    carbs_g: number
    fat_g: number
    confidence: number
  }>
  total_kcal: number
  total_protein_g: number
  total_carbs_g: number
  total_fat_g: number
  hidden_suggestions: string[]
  confidence_overall: number
  notes: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  ts: string
}

export const aiApi = {
  analyzeFood: async (imageBase64: string, mimeType: string): Promise<FoodAnalysisResult> => {
    const { data } = await api.post('/ai/analyze-food', { imageBase64, mimeType })
    return data
  },
  getChat: async (): Promise<ChatMessage[]> => {
    const { data } = await api.get<{ messages: ChatMessage[] }>('/ai/chat')
    return data.messages
  },
  sendMessage: async (content: string): Promise<ChatMessage> => {
    const { data } = await api.post<{ message: ChatMessage }>('/ai/chat', { message: content })
    return data.message
  },
  clearChat: async (): Promise<void> => {
    await api.delete('/ai/chat')
  },
}
