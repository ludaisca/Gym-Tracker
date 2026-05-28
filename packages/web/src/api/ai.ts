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
    const { data } = await api.post<{ message?: ChatMessage, status?: string }>('/ai/chat', { message: content })
    if (data.status === 'processing') {
      // Poll for the new message
      return new Promise((resolve, reject) => {
        let attempts = 0
        const interval = setInterval(async () => {
          attempts++
          if (attempts > 30) {
            clearInterval(interval)
            reject(new Error('Timeout esperando a la IA'))
            return
          }
          try {
            const msgs = await aiApi.getChat()
            const lastMsg = msgs[msgs.length - 1]
            if (lastMsg && lastMsg.role === 'assistant') {
              clearInterval(interval)
              resolve(lastMsg)
            }
          } catch (e) {
            // ignore and retry
          }
        }, 2000)
      })
    }
    return data.message!
  },
  clearChat: async (): Promise<void> => {
    await api.delete('/ai/chat')
  },
  getWeeklyBrief: async (): Promise<string> => {
    const { data } = await api.post<{ analysis: string }>('/ai/analyze')
    return data.analysis ?? ''
  },
}
