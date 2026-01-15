/**
 * API 客户端配置
 */

import axios from 'axios';

// 开发模式使用后端地址，生产模式使用相对路径
const baseURL = import.meta.env.DEV
  ? 'http://localhost:8080'
  : '';

export const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 响应拦截器
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export default api;
