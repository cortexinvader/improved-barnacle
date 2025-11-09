import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface User {
  id: string;
  username: string;
  role: "student" | "department-governor" | "faculty-governor" | "admin";
  departmentName: string;
  phone: string;
  regNumber?: string;
  tutorialSeen: boolean;
}

interface LoginCredentials {
  username: string;
  password: string;
}

interface SignupData {
  username: string;
  password: string;
  phone: string;
  regNumber: string;
  departmentName: string;
}

async function fetchWithCredentials(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export function useAuth() {
  return useQuery<User | null>({
    queryKey: ["auth"],
    queryFn: async () => {
      try {
        const data = await fetchWithCredentials("/api/auth/me");
        return data.user;
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const data = await fetchWithCredentials("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });
      return data.user as User;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["auth"], user);
    },
  });
}

export function useSignup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (signupData: SignupData) => {
      const data = await fetchWithCredentials("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(signupData),
      });
      return data.user as User;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["auth"], user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await fetchWithCredentials("/api/auth/logout", {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.setQueryData(["auth"], null);
      queryClient.clear();
    },
  });
}
