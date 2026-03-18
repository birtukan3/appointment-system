import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

class ApiService {
  constructor() {
    this.token = null
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        const token = this.token || localStorage.getItem('token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
        }
        return Promise.reject(error)
      }
    )
  }

  setToken(token) {
    this.token = token
    if (token) {
      localStorage.setItem('token', token)
    }
  }

  get(url, config = {}) {
    return this.api.get(url, config)
  }

  post(url, data, config = {}) {
    return this.api.post(url, data, config)
  }

  patch(url, data, config = {}) {
    return this.api.patch(url, data, config)
  }

  delete(url, config = {}) {
    return this.api.delete(url, config)
  }
}

export default new ApiService()