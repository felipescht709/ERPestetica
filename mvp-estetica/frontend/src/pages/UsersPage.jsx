// frontend/src/pages/UsersPage.jsx
import React, { useState, useEffect, useContext, useCallback } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
// Importar ícones do Lucide React
import { Plus, Search, Edit, Trash2, Shield, Mail, Phone, MapPin, Building, Briefcase, Users as UsersIcon } from 'lucide-react'; // Renomear Users do Lucide para UsersIcon para evitar conflito
// Importar componentes específicos do react-bootstrap que ainda são utilizados
import { Spinner, Alert, Table, Modal, Form, Row, Col } from 'react-bootstrap';


const UsersPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentUser, setCurrentUser] = useState({
        cod_usuario: null,
        nome_usuario: '',
        email: '',
        role: 'atendente', // Default para novo usuário
        ativo: true,
        telefone_contato: '',
        // Campos de endereço e empresa não serão editáveis nesta tela para simplificar,
        // pois geralmente são definidos no cadastro inicial da empresa (admin principal)
    });
    const [message, setMessage] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const { userRole, user: loggedInUser } = useContext(AuthContext); // Pega a role e o usuário logado
    const canManageUsers = ['admin'].includes(userRole); // Apenas admins podem gerenciar usuários

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // A rota /usuarios deve retornar usuários da mesma empresa
            const data = await api('/usuarios', { method: 'GET' });
            setUsers(data);
        } catch (err) {
            console.error('Erro ao buscar usuários:', err);
            setError(err.message || 'Erro ao carregar usuários.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (canManageUsers) {
            fetchUsers();
        } else {
            setLoading(false);
            setError('Você não tem permissão para gerenciar usuários.');
        }
    }, [canManageUsers, fetchUsers]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setCurrentUser(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const openCreateModal = () => {
        setIsEditing(false);
        setCurrentUser({
            cod_usuario: null,
            nome_usuario: '',
            email: '',
            role: 'atendente',
            ativo: true,
            telefone_contato: '',
        });
        setShowModal(true);
        setMessage(null);
        setError(null);
    };

    const openEditModal = (user) => {
        setIsEditing(true);
        setCurrentUser({
            ...user,
            ativo: user.ativo ?? true,
        });
        setShowModal(true);
        setMessage(null);
        setError(null);
    };

    const closeModal = () => {
        setShowModal(false);
        setMessage(null);
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Adicionar validação de formulário aqui se necessário
        if (!currentUser.nome_usuario || !currentUser.email || !currentUser.role) {
            setError('Nome, Email e Função (Role) são obrigatórios.');
            return;
        }

        if (isEditing && currentUser.cod_usuario === loggedInUser.cod_usuario && currentUser.ativo === false) {
             setError('Você não pode desativar sua própria conta.');
             return;
        }

        setLoading(true);
        setMessage(null);
        setError(null);

        try {
            const userToSave = { ...currentUser };
            // Para criação de novo usuário, você precisaria de uma senha (pode ser uma senha temporária ou gerada)
            // Para simplificar, estou apenas permitindo edição de campos ou um admin inicial
            // Se precisar de senha, adicione um campo de senha ao modal de criação/edição.
            
            // Removendo campos que não serão atualizados ou são gerados no backend
            delete userToSave.cnpj;
            delete userToSave.nome_empresa;
            delete userToSave.senha_hash; // Nunca envie a senha hash de volta

            if (userToSave.telefone_contato.trim() === '') userToSave.telefone_contato = null;

            let res;
            if (isEditing) {
                await api(`/usuarios/${userToSave.cod_usuario}`, { method: 'PUT', body: JSON.stringify(userToSave) });
                setMessage({ type: 'success', text: 'Usuário atualizado com sucesso!' });
            } else {
                // Para criar um novo usuário via esta tela, você precisaria de uma senha.
                // Como não há campo de senha no modal simplificado, farei um placeholder:
                // No cenário real, você enviaria uma senha gerada ou um campo para o admin digitar.
                alert('Funcionalidade de criação de usuário não implementada com senha nesta versão. Use a tela de registro/login para admin inicial.'); // Usar modal customizado
                setLoading(false);
                return;
                // Exemplo se adicionar campo de senha:
                // await api('/auth/register', { method: 'POST', body: JSON.stringify({...userToSave, senha: 'senha_temporaria'}) });
            }
            fetchUsers();
            closeModal();
        } catch (err) {
            console.error('Erro ao salvar usuário:', err);
            setMessage({ type: 'danger', text: err.message || 'Erro ao salvar usuário. Verifique os dados e tente novamente.' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (cod_usuario) => {
        if (cod_usuario === loggedInUser.cod_usuario) {
            setError('Você não pode excluir sua própria conta.');
            return;
        }
        if (window.confirm('Tem certeza que deseja desativar este usuário?')) { // Alterado para desativar, não excluir
            setLoading(true);
            setMessage(null);
            setError(null);
            try {
                // Em vez de DELETE, fazemos um PUT para desativar o usuário
                await api(`/usuarios/${cod_usuario}`, { method: 'PUT', body: JSON.stringify({ ativo: false }) });
                setMessage({ type: 'success', text: 'Usuário desativado com sucesso!' });
                fetchUsers(); // Atualiza a lista
            } catch (err) {
                console.error('Erro ao desativar usuário:', err);
                setMessage({ type: 'danger', text: err.message || 'Erro ao desativar usuário. Tente novamente.' });
            } finally {
                setLoading(false);
            }
        }
    };

    // Filtra usuários com base no termo de busca
    const filteredUsers = users.filter(user =>
        user.nome_usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Renderização de carregamento, erro ou acesso negado
    if (loading) {
        return (
            <div className="loading-screen">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Carregando usuários...</span>
                </Spinner>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert error my-4">
                <h3>Erro de Acesso / Carregamento</h3>
                <p>{error}</p>
            </div>
        );
    }

    if (!canManageUsers) {
        return (
            <div className="alert error my-4">
                <h3>Acesso Negado</h3>
                <p>Você não tem permissão para gerenciar usuários.</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-section-header">
                <h2><UsersIcon size={28} style={{verticalAlign: 'middle', marginRight: '10px'}} /> Gerenciamento de Usuários</h2>
                <button className="btn-primary-dark" onClick={openCreateModal}>
                    <Plus size={20} />
                    Adicionar Novo Usuário
                </button>
            </div>

            {message && (
                <div className={`alert ${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="search-input-container">
                <Search size={20} className="search-icon" />
                <input
                    type="text"
                    placeholder="Buscar usuários..."
                    className="input-field"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="section-content"> {/* Adicionado section-content para o estilo de card */}
                <h3 className="card-title mb-3">Lista de Usuários</h3>
                <div className="table-responsive">
                    <Table striped bordered hover className="clients-table"> {/* Reutilizado clients-table para estilização */}
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Email</th>
                                <th>Função</th>
                                <th>Telefone</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="empty-state-table">Nenhum usuário encontrado.</td>
                                </tr>
                            ) : (
                                filteredUsers.map((userItem) => (
                                    <tr key={userItem.cod_usuario}>
                                        <td>{userItem.nome_usuario}</td>
                                        <td>{userItem.email}</td>
                                        <td>{userItem.role}</td>
                                        <td>{userItem.telefone_contato || 'N/A'}</td>
                                        <td>
                                            <span className={`status-badge ${userItem.ativo ? 'status-confirmado' : 'status-inativo'}`}>
                                                {userItem.ativo ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td>
                                            <button className="btn-action" onClick={() => openEditModal(userItem)} title="Editar">
                                                <Edit size={18} />
                                            </button>
                                            {userItem.cod_usuario !== loggedInUser.cod_usuario && ( // Não permite desativar a própria conta
                                                <button className="btn-action btn-delete" onClick={() => handleDelete(userItem.cod_usuario)} title="Desativar">
                                                    <Trash2 size={18} /> {/* Ícone de lixeira para "desativar" */}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </div>
            </div>

            {/* Modal de Adicionar/Editar Usuário */}
            {showModal && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <h3>{isEditing ? 'Editar Usuário' : 'Adicionar Novo Usuário'}</h3>
                        {error && <div className="alert error">{error}</div>}
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="nome_usuario">Nome Completo:</label>
                                <input type="text" name="nome_usuario" id="nome_usuario" value={currentUser.nome_usuario} onChange={handleInputChange} required className="input-field" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="email">Email:</label>
                                <input type="email" name="email" id="email" value={currentUser.email} onChange={handleInputChange} required className="input-field" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="role">Função (Role):</label>
                                <select name="role" id="role" value={currentUser.role} onChange={handleInputChange} required className="input-field">
                                    <option value="admin">Administrador</option>
                                    <option value="gerente">Gerente</option>
                                    <option value="gestor">Gestor</option>
                                    <option value="atendente">Atendente</option>
                                    <option value="tecnico">Técnico</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="telefone_contato">Telefone de Contato:</label>
                                <input type="text" name="telefone_contato" id="telefone_contato" value={currentUser.telefone_contato} onChange={handleInputChange} className="input-field" />
                            </div>
                            <div className="form-group">
                                <input type="checkbox" name="ativo" id="ativo" checked={currentUser.ativo} onChange={handleInputChange} disabled={currentUser.cod_usuario === loggedInUser.cod_usuario} /> {/* Não permite desativar a própria conta */}
                                <label htmlFor="ativo" style={{ display: 'inline-block', marginLeft: '10px' }}>Usuário Ativo</label>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="button-secondary" onClick={closeModal}>
                                    Cancelar
                                </button>
                                <button type="submit" className="button-primary">
                                    {isEditing ? 'Salvar Alterações' : 'Adicionar Usuário'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersPage;
