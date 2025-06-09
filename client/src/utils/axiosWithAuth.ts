import axios from "axios";
import Cookies from "js-cookie";
import { API_BASE_URL } from "./constants";

const token = Cookies.get("access_token");

// Create a new axios instance with interceptors to handle token refreshing
const axiosWithAuth = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// Add a response interceptor to handle 401 errors
axiosWithAuth.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Redirect to login page or refresh token
      console.error("Authentication error:", error);
      // You could redirect to login page here
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosWithAuth;
