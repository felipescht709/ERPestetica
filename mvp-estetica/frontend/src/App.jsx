// frontend/src/App.jsx
import React, { useContext } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';

// Importe suas páginas
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import AgendaPage from './pages/AgendaPage';
import ConfiguracoesPage from './pages/ConfiguracoesPage'; // <-- AGORA IMPORTANDO ConfiguracoesPage
import ClientsPage from './pages/ClientsPage';
import ServicesPage from './pages/ServicesPage';
import UsersPage from './pages/UsersPage';
import FinanceiroPage from './pages/FinanceiroPage';

// Componente para o Layout da aplicação (mantém-se o mesmo)
const AppLayout = ({ children }) => {
    const { user, userRole, logout } = useContext(AuthContext);

    if (!user) {
        return null;
    }

    return (
        <div id="app-container" className="container">
            <header className="app-header">
                <div className="header-left">
                    <div className="logo-section">
                        <div className="logo-icon-placeholder">
                            🚗 {/* Placeholder visual. Futuramente, será um SVG da GerenciaCAR */}
                        </div>
                        <div>
                            <h1 className="app-title">GerenciaCAR</h1>
                            <p className="app-subtitle">Gestão Completa</p>
                        </div>
                    </div>
                    {/* Navegação principal no header */}
                    <nav className="main-nav">
                        <ul>
                            <li className="nav-item">
                                <Link to="/home">🏠 Home</Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/agenda">📅 Agenda</Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/clientes">👥 Clientes</Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/servicos">⚙️ Serviços</Link>
                            </li>
                            {userRole === 'admin' && (
                                <li className="nav-item">
                                    <Link to="/usuarios">🧑‍💻 Usuários</Link>
                                </li>
                            )}
                            <li className="nav-item">
                                <Link to="/financeiro">💰 Financeiro</Link>
                            </li>
                            {/* LINK PARA A PÁGINA CENTRAL DE CONFIGURAÇÕES */}
                            {(userRole === 'admin' || userRole === 'gestor') && (
                                <li className="nav-item">
                                    <Link to="/configuracoes">⚙️ Configurações</Link> {/* APONTA PARA A ROTA GERAL */}
                                </li>
                            )}
                        </ul>
                    </nav>
                </div>

                <div className="header-right">
                    <div className="user-info-header">
                        <span id="logged-in-user-name">{user.nome_usuario}</span>
                        <span id="logged-in-user-email" className="text-sm text-gray-500">{user.email}</span>
                    </div>
                    <button id="logout-button" className="button-secondary" onClick={logout}>Sair</button>
                </div>
            </header>

            <main className="main-content">
                {children}
            </main>
        </div>
    );
};

// Componente de Rota Protegida (mantém-se o mesmo)
const PrivateRoute = ({ children, requiredRoles }) => {
    const { isAuthenticated, userRole, loadingAuth } = useContext(AuthContext);

    if (loadingAuth) {
        return <div className="loading-screen">Carregando autenticação...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRoles && !requiredRoles.includes(userRole)) {
        return <Navigate to="/home" replace />;
    }

    return children;
};


function App() {
    const { loadingAuth, isAuthenticated } = useContext(AuthContext);

    if (loadingAuth) {
        return <div className="loading-screen">Inicializando aplicação...</div>;
    }

    return (
        <Routes>
            {/* Rotas Públicas */}
            <Route path="/login" element={<AuthPage />} />
            <Route path="/register" element={<AuthPage />} />
            <Route
                path="/"
                element={isAuthenticated ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />}
            />

            {/* Rotas Protegidas */}
            <Route
                path="/home"
                element={
                    <PrivateRoute requiredRoles={['admin', 'gerente', 'gestor', 'atendente', 'tecnico']}>
                        <AppLayout><HomePage /></AppLayout>
                    </PrivateRoute>
                }
            />
            <Route
                path="/agenda"
                element={
                    <PrivateRoute requiredRoles={['admin', 'gerente', 'atendente', 'tecnico', 'gestor']}>
                        <AppLayout><AgendaPage /></AppLayout>
                    </PrivateRoute>
                }
            />
            <Route
                path="/clientes"
                element={
                    <PrivateRoute requiredRoles={['admin', 'gerente', 'atendente']}>
                        <AppLayout><ClientsPage /></AppLayout>
                    </PrivateRoute>
                }
            />
            <Route
                path="/servicos"
                element={
                    <PrivateRoute requiredRoles={['admin', 'gerente']}>
                        <AppLayout><ServicesPage /></AppLayout>
                    </PrivateRoute>
                }
            />
            <Route
                path="/usuarios"
                element={
                    <PrivateRoute requiredRoles={['admin']}>
                        <AppLayout><UsersPage /></AppLayout>
                    </PrivateRoute>
                }
            />
            <Route
                path="/financeiro"
                element={
                    <PrivateRoute requiredRoles={['admin', 'gerente']}>
                        <AppLayout><FinanceiroPage /></AppLayout>
                    </PrivateRoute>
                }
            />
            {/* ROTA CENTRALIZADA DE CONFIGURAÇÕES */}
            <Route
                path="/configuracoes" // URL para a página de configurações gerais
                element={
                    <PrivateRoute requiredRoles={['admin', 'gestor']}>
                        <AppLayout><ConfiguracoesPage /></AppLayout> {/* Renderiza a página centralizada */}
                    </PrivateRoute>
                }
            />

            {/* Catch-all para rotas não encontradas */}
            <Route path="*" element={<div className="empty-state"><h2>404 - Página Não Encontrada</h2><p><Link to="/home" className="button-link">Voltar para a Home</Link></p></div>} />
        </Routes>
    );
}

export default App;