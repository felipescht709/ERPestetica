// frontend/src/utils/api.js
const API_BASE_URL = 'http://localhost:3001/api'; // <--- VERIFIQUE ESTA LINHA COM ATENÇÃO!

const getAuthToken = () => {
    return localStorage.getItem('autoEsteticaJwt');
};

const api = async (url, options = {}) => {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${url}`, { // Problema estava aqui se API_BASE_URL fosse undefined
        ...options,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('autoEsteticaJwt');
        window.location.href = '/login';
        throw new Error('Sessão expirada ou acesso negado.');
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ msg: 'Erro desconhecido.' }));
        throw new Error(errorData.msg || `Erro na requisição: ${response.status} ${response.statusText}`); // Mensagem de erro mais detalhada
    }

    return response.json();
};

export default api;