// public/js/auth.js

const AUTH_API_BASE_URL = 'http://localhost:3001/api/auth';
const JWT_TOKEN_KEY = 'autoEsteticaJwt';

document.addEventListener('DOMContentLoaded', async () => {
    const authSection = document.getElementById('auth-section');
    const appContainer = document.getElementById('app-container');
    const sidebar = document.getElementById('app-sidebar');
    // const mainContent = document.getElementById('main-content'); // Not directly used here anymore
    const authForm = document.getElementById('auth-form');
    const authTitle = document.getElementById('auth-title');
    const authSubmitButton = document.getElementById('auth-submit-button');
    const switchToRegisterLink = document.getElementById('switch-to-register');
    const logoutButton = document.getElementById('logout-button');
    const loggedInUserName = document.getElementById('logged-in-user-name');
    const loggedInUserEmail = document.getElementById('logged-in-user-email');
    const authMessageDiv = document.getElementById('auth-message'); // Elemento para mensagens

    let isRegisterMode = false;

    // --- Funções de UI ---
    function showMessage(type, message) {
        authMessageDiv.textContent = message;
        authMessageDiv.className = `auth-message ${type}`; // Add type class (success/error)
        authMessageDiv.style.display = 'block';
        setTimeout(() => {
            authMessageDiv.style.display = 'none';
            authMessageDiv.textContent = '';
        }, 5000); // Esconde a mensagem após 5 segundos
    }

    function toggleFormState(enable) {
        const inputs = authForm.querySelectorAll('input');
        inputs.forEach(input => input.disabled = !enable);
        authSubmitButton.disabled = !enable;
        switchToRegisterLink.style.pointerEvents = enable ? 'auto' : 'none';
        switchToRegisterLink.style.opacity = enable ? '1' : '0.5';
    }

    function clearForm() {
        authForm.reset(); // Limpa todos os campos do formulário
        const nameInput = document.getElementById('name');
        if (nameInput) nameInput.value = '';
    }

    // Função para mostrar/esconder seções
    function showApp() {
        authSection.style.display = 'none';
        appContainer.style.display = 'flex';
        sidebar.style.display = 'flex';
        // Redireciona para o dashboard após login bem-sucedido
        // A lógica do main.js já lida com o disparo do sectionActivated
        window.location.hash = '#dashboard';
    }

    function showAuth() {
        authSection.style.display = 'flex';
        appContainer.style.display = 'none';
        sidebar.style.display = 'none';
        // Limpa o hash da URL
        history.replaceState(null, '', '/');
    }

    // --- Lógica de Autenticação ---
    async function checkAuth() {
        const token = localStorage.getItem(JWT_TOKEN_KEY);
        if (token) {
            try {
                const response = await fetch(`${AUTH_API_BASE_URL}/me`, {
                    method: 'GET',
                    headers: {
                        'x-auth-token': token
                    }
                });
                if (response.ok) {
                    const userData = await response.json();
                    loggedInUserName.textContent = userData.nome;
                    loggedInUserEmail.textContent = userData.email;
                    localStorage.setItem('userRole', userData.role);

                    // Dynamically show/hide "Usuários" menu item
                    const usersMenuItem = document.querySelector('.nav-item[data-section="usuarios"]');
                    if (usersMenuItem) {
                        usersMenuItem.style.display = userData.role === 'admin' ? 'list-item' : 'none';
                    }

                    showApp();
                } else {
                    console.error('Token inválido ou expirado. Faça login novamente.');
                    showMessage('error', 'Sessão expirada ou inválida. Por favor, faça login novamente.');
                    localStorage.removeItem(JWT_TOKEN_KEY);
                    localStorage.removeItem('userRole');
                    showAuth();
                }
            } catch (error) {
                console.error('Erro ao verificar autenticação:', error);
                showMessage('error', 'Não foi possível conectar ao servidor. Tente novamente mais tarde.');
                localStorage.removeItem(JWT_TOKEN_KEY);
                localStorage.removeItem('userRole');
                showAuth();
            }
        } else {
            showAuth();
        }
    }

    // Lidar com o envio do formulário de autenticação
    authForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        toggleFormState(false); // Desabilita o formulário

        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const email = emailInput.value;
        const password = passwordInput.value;

        // Validação básica de frontend
        if (!email.includes('@') || !email.includes('.')) {
            showMessage('error', 'Por favor, insira um email válido.');
            toggleFormState(true);
            return;
        }
        if (password.length < 6) {
            showMessage('error', 'A senha deve ter no mínimo 6 caracteres.');
            toggleFormState(true);
            return;
        }

        let endpoint = isRegisterMode ? 'register' : 'login';
        let body = { email, senha: password }; // 'senha' no backend

        if (isRegisterMode) {
            const nameInput = document.getElementById('name');
            if (!nameInput || nameInput.value.trim() === '') {
                showMessage('error', 'O nome é obrigatório para registro.');
                toggleFormState(true);
                return;
            }
            body.nome = nameInput.value.trim();
            body.role = 'usuario'; // Default role for new registrations
        }

        try {
            const response = await fetch(`${AUTH_API_BASE_URL}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem(JWT_TOKEN_KEY, data.token);
                showMessage('success', `Sucesso! ${isRegisterMode ? 'Conta criada.' : 'Login realizado.'}`);
                clearForm();
                await checkAuth(); // Re-check auth to get user data and display app
            } else {
                const errorData = await response.json();
                showMessage('error', `Erro: ${errorData.msg || 'Credenciais inválidas'}`);
            }
        } catch (error) {
            console.error('Erro na autenticação:', error);
            showMessage('error', 'Ocorreu um erro de rede ou servidor. Tente novamente.');
        } finally {
            toggleFormState(true); // Reabilita o formulário
        }
    });

    // Alternar entre login e registro
    switchToRegisterLink.addEventListener('click', (event) => {
        event.preventDefault();
        isRegisterMode = !isRegisterMode;
        authTitle.textContent = isRegisterMode ? 'Registrar' : 'Login';
        authSubmitButton.textContent = isRegisterMode ? 'Registrar' : 'Entrar';
        authMessageDiv.style.display = 'none'; // Esconde mensagens ao alternar modo
        clearForm(); // Limpa o formulário ao alternar

        const nameGroup = authForm.querySelector('.form-group.name-group');
        if (isRegisterMode) {
            if (!nameGroup) {
                const newNameGroup = document.createElement('div');
                newNameGroup.classList.add('form-group', 'name-group');
                newNameGroup.innerHTML = `
                    <label for="name">Nome:</label>
                    <input type="text" id="name" required>
                `;
                authForm.insertBefore(newNameGroup, authForm.firstElementChild.nextElementSibling);
            }
        } else {
            if (nameGroup) {
                nameGroup.remove();
            }
        }
    });

    // Lidar com o logout
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem(JWT_TOKEN_KEY);
        localStorage.removeItem('userRole');
        alert('Você foi desconectado.'); // Alerta simples, pode ser melhorado com um modal
        showAuth();
    });

    // Iniciar a verificação de autenticação ao carregar a página
    checkAuth();
});