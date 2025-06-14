// public/js/usuarios.js

document.addEventListener('DOMContentLoaded', () => {
    const usuariosContent = document.getElementById('usuarios-content');
    if (usuariosContent) {
        usuariosContent.addEventListener('sectionActivated', fetchUsers);
        const addUserButton = document.getElementById('add-user-button');
        addUserButton.addEventListener('click', () => openUserModal());

        // Initial load if Users is the active section
        if (usuariosContent.classList.contains('active')) {
            fetchUsers();
        }
    }
});

async function fetchUsers() {
    const userListContainer = document.getElementById('user-list');
    const token = localStorage.getItem('autoEsteticaJwt');
    const userRole = localStorage.getItem('userRole');

    if (!token || userRole !== 'admin') {
        userListContainer.innerHTML = '<p class="empty-state">Você não tem permissão para visualizar esta seção.</p>';
        return;
    }

    try {
        const response = await fetch('http://localhost:3001/api/usuarios', {
            headers: {
                'x-auth-token': token
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'Falha ao carregar usuários');
        }
        const users = await response.json();

        if (users.length === 0) {
            userListContainer.innerHTML = '<p class="empty-state">Nenhum usuário cadastrado.</p>';
            return;
        }

        userListContainer.innerHTML = users.map(user => `
            <div class="card list-item">
                <div class="flex-between-center" style="align-items: flex-start;">
                    <div class="flex-1">
                        <div class="flex items-center space-x-3 mb-3">
                            <div class="logo-circle" style="width: 40px; height: 40px; background-color: var(--blue-status); color: var(--blue-text); border-radius: 9999px;">🧑‍💻</div>
                            <div>
                                <h3 class="text-lg font-semibold text-gray-900">${user.nome}</h3>
                                <span class="status-badge status-${user.ativo ? 'ativo' : 'inativo'}">
                                    ${user.ativo ? 'Ativo' : 'Inativo'}
                                </span>
                            </div>
                        </div>
                        <div class="client-detail-grid">
                            <div><span>📧 ${user.email}</span></div>
                            <div><span>Função: ${user.role}</span></div>
                            <div><span>Desde: ${new Date(user.data_cadastro).toLocaleDateString('pt-BR')}</span></div>
                        </div>
                        <div class="flex space-x-2" style="margin-top: 15px; justify-content: flex-end;">
                            <button class="button-primary edit-user-button" data-id="${user.id}">Editar</button>
                            <button class="button-primary delete-user-button" data-id="${user.id}">Excluir</button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        userListContainer.querySelectorAll('.edit-user-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const userId = event.target.dataset.id;
                const userToEdit = users.find(u => u.id == userId);
                if (userToEdit) {
                    openUserModal(userToEdit);
                }
            });
        });

        userListContainer.querySelectorAll('.delete-user-button').forEach(button => {
            button.addEventListener('click', async (event) => {
                const userId = event.target.dataset.id;
                if (confirm(`Tem certeza que deseja excluir o usuário ${userId}? Isso é irreversível.`)) {
                    await deleteUser(userId);
                    fetchUsers();
                }
            });
        });

    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        userListContainer.innerHTML = `<p class="empty-state">Erro ao carregar usuários: ${error.message}</p>`;
    }
}

// Modal para Adicionar/Editar Usuário
function openUserModal(user = null) {
    let modalOverlay = document.getElementById('user-modal-overlay');
    if (!modalOverlay) {
        modalOverlay = document.createElement('div');
        modalOverlay.id = 'user-modal-overlay';
        modalOverlay.classList.add('modal-overlay');
        document.body.appendChild(modalOverlay);
    }

    const isEditing = user !== null;
    const modalTitle = isEditing ? 'Editar Usuário' : 'Novo Usuário';
    const submitButtonText = isEditing ? 'Salvar Alterações' : 'Cadastrar';
    const passwordPlaceholder = isEditing ? 'Deixe em branco para não alterar' : 'Digite a senha';
    const passwordRequired = isEditing ? '' : 'required';

    modalOverlay.innerHTML = `
        <div class="modal-content">
            <button class="modal-close-button">&times;</button>
            <h3 class="modal-title">${modalTitle}</h3>
            <form id="user-form" class="modal-form">
                <input type="hidden" id="user-id" value="${user ? user.id : ''}">
                <div class="form-group">
                    <label for="modal-user-name">Nome:</label>
                    <input type="text" id="modal-user-name" value="${user ? user.nome : ''}" required>
                </div>
                <div class="form-group">
                    <label for="modal-user-email">Email:</label>
                    <input type="email" id="modal-user-email" value="${user ? user.email : ''}" required>
                </div>
                <div class="form-group">
                    <label for="modal-user-password">Senha:</label>
                    <input type="password" id="modal-user-password" placeholder="${passwordPlaceholder}" ${passwordRequired}>
                </div>
                <div class="form-group">
                    <label for="modal-user-role">Função:</label>
                    <select id="modal-user-role" required>
                        <option value="usuario" ${user && user.role === 'usuario' ? 'selected' : ''}>Usuário</option>
                        <option value="gestor" ${user && user.role === 'gestor' ? 'selected' : ''}>Gestor</option>
                        <option value="admin" ${user && user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </div>
                <div class="form-group checkbox-group">
                    <input type="checkbox" id="modal-user-active" ${user === null || user.ativo ? 'checked' : ''}>
                    <label for="modal-user-active">Ativo</label>
                </div>
                <div class="button-group">
                    <button type="button" class="cancel-button">Cancelar</button>
                    <button type="submit" class="submit-button">${submitButtonText}</button>
                </div>
            </form>
        </div>
    `;

    modalOverlay.style.display = 'flex';

    modalOverlay.querySelector('.modal-close-button').addEventListener('click', closeUserModal);
    modalOverlay.querySelector('.cancel-button').addEventListener('click', closeUserModal);

    modalOverlay.querySelector('#user-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const userId = document.getElementById('user-id').value;
        const nome = document.getElementById('modal-user-name').value;
        const email = document.getElementById('modal-user-email').value;
        const senha = document.getElementById('modal-user-password').value;
        const role = document.getElementById('modal-user-role').value;
        const ativo = document.getElementById('modal-user-active').checked;

        const userData = { nome, email, role, ativo };
        if (senha) { // Only send password if it's not empty
            userData.senha = senha;
        }

        const token = localStorage.getItem('autoEsteticaJwt');
        const headers = {
            'Content-Type': 'application/json',
            'x-auth-token': token
        };

        try {
            let response;
            if (isEditing) {
                response = await fetch(`http://localhost:3001/api/usuarios/${userId}`, {
                    method: 'PUT',
                    headers: headers,
                    body: JSON.stringify(userData)
                });
            } else {
                response = await fetch('http://localhost:3001/api/usuarios', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(userData)
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.msg || 'Erro na operação de usuário');
            }

            alert(`Usuário ${isEditing ? 'atualizado' : 'cadastrado'} com sucesso!`);
            closeUserModal();
            fetchUsers(); // Refresh the user list
        } catch (error) {
            console.error('Erro ao salvar usuário:', error);
            alert('Erro ao salvar usuário: ' + error.message);
        }
    });
}

function closeUserModal() {
    const modalOverlay = document.getElementById('user-modal-overlay');
    if (modalOverlay) {
        modalOverlay.style.display = 'none';
        modalOverlay.remove();
    }
}

async function deleteUser(id) {
    const token = localStorage.getItem('autoEsteticaJwt');
    try {
        const response = await fetch(`http://localhost:3001/api/usuarios/${id}`, {
            method: 'DELETE',
            headers: {
                'x-auth-token': token
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'Falha ao excluir usuário');
        }
        alert('Usuário excluído com sucesso!');
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        alert('Erro ao excluir usuário: ' + error.message);
    }
}