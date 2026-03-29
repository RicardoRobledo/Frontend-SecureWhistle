let inMemoryToken: string | null = null;

export const setToken = (token: string) => { inMemoryToken = token; };
export const getToken = () => inMemoryToken;
export const clearToken = () => { inMemoryToken = null; };