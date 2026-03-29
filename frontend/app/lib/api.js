import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

class ApiService {
  constructor() {
    this.token = null
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    })

    this.api.interceptors.request.use(
      (config) => {
        const token = this.token || this.getStoredToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.clearSession()
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
            window.location.assign('/login')
          }
        }
        return Promise.reject(error)
      }
    )
  }

  getStoredToken() {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem('token')
  }

  clearSession() {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem('token')
    window.localStorage.removeItem('user')
  }

  setToken(token) {
    this.token = token
    if (typeof window !== 'undefined') {
      if (token) {
        window.localStorage.setItem('token', token)
      } else {
        window.localStorage.removeItem('token')
      }
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