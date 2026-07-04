import axios from 'axios'

const BASE_URL = '/api'

const client = axios.create({ baseURL: BASE_URL })

// Attach JWT token to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('ta_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ta_token')
      localStorage.removeItem('ta_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authAPI = {
  login: async (email, password) => {
    const res = await client.post('/auth/login', { email, password })
    return res.data
  },

  register: async (payload) => {
    const res = await client.post('/auth/register', payload)
    return res.data
  },

  me: async () => {
    const res = await client.get('/auth/me')
    return res.data
  },
}

export const agentAPI = {
  list: async () => {
    const res = await client.get('/agents/list')
    return res.data
  },

  run: async (agent, task, context = null, llm_provider = 'groq') => {
    const res = await client.post('/agents/run', { agent, task, context, llm_provider })
    return res.data
  },
}

export default client
