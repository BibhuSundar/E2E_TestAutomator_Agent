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

export const jiraAPI = {
  fetchIssue: async (issueKey) => {
    const res = await client.get(`/jira/issue/${issueKey}`)
    return res.data
  },

  createIssue: async (projectKey, summary, description, issueType = 'Story') => {
    const res = await client.post('/jira/create-issue', {
      project_key: projectKey,
      summary,
      description,
      issue_type: issueType,
    })
    return res.data
  },
}

export const filesAPI = {
  upload: async (file, agent = 'product_requirement') => {
    const form = new FormData()
    form.append('file', file)
    const res = await client.post(`/files/upload?agent=${encodeURIComponent(agent)}`, form)
    return res.data
  },

  saveOutput: async (agent, content) => {
    const res = await client.post('/files/save-output', { agent, content })
    return res.data
  },

  listOutput: async (agent) => {
    const params = agent ? `?agent=${encodeURIComponent(agent)}` : ''
    const res = await client.get(`/files/list-output${params}`)
    return res.data
  },

  readOutput: async (filename) => {
    const res = await client.get(`/files/read-output/${filename}`)
    return res.data
  },
}

export const configAPI = {
  getJira: async () => {
    const res = await client.get('/config/jira')
    return res.data
  },
  updateJira: async (data) => {
    const res = await client.post('/config/jira', data)
    return res.data
  },
}

export const userAPI = {
  list: async () => {
    const res = await client.get('/auth/users')
    return res.data
  },
  create: async (data) => {
    const res = await client.post('/auth/users', data)
    return res.data
  },
  update: async (userId, data) => {
    const res = await client.put(`/auth/users/${userId}`, data)
    return res.data
  },
  delete: async (userId) => {
    const res = await client.delete(`/auth/users/${userId}`)
    return res.data
  },
}

export const supportAPI = {
  chat: async (question) => {
    const res = await client.post('/support/chat', { question })
    return res.data
  },
}

export default client
