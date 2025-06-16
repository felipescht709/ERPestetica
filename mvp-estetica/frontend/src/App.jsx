// frontend/src/App.jsx
import React, { useContext } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css'; 
import { Navbar, Nav, Container, Button } from 'react-bootstrap'; 


// Importe suas páginas
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import AgendaPage from './pages/AgendaPage';
import ConfiguracoesPage from './pages/ConfiguracoesPage';
import ClientsPage from './pages/ClientsPage';
import ServicesPage from './pages/ServicesPage';
import UsersPage from './pages/UsersPage';
import FinanceiroPage from './pages/FinanceiroPage';

// Componente para o Layout da aplicação
const AppLayout = ({ children }) => {
    const { user, userRole, logout } = useContext(AuthContext);

    if (!user) {
        return null;
    }

    return (
        // Use Container do react-bootstrap para o layout principal
        <Container fluid className="p-0"> {/* Use fluid para largura total e p-0 para remover padding padrão */}
            <Navbar bg="dark" variant="dark" expand="lg" className="app-header"> {/* Navbar para o cabeçalho */}
                <Container fluid>
                    <Navbar.Brand as={Link} to="/home" className="d-flex align-items-center">
                        <div className="logo-icon-placeholder me-2">
                            🚗 {/* Placeholder visual. Futuramente, será um SVG da GerenciaCAR */}
                        </div>
                        <div>
                            <h1 className="app-title mb-0">GerenciaCAR</h1>
                        </div>
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="me-auto main-nav"> {/* me-auto para alinhar à esquerda */}
                            <Nav.Link as={Link} to="/home">🏠 Home</Nav.Link>
                            <Nav.Link as={Link} to="/agenda">📅 Agenda</Nav.Link>
                            <Nav.Link as={Link} to="/clientes">👥 Clientes</Nav.Link>
                            <Nav.Link as={Link} to="/servicos">⚙️ Serviços</Nav.Link>
                            {userRole === 'admin' && (
                                <Nav.Link as={Link} to="/usuarios">🧑‍💻 Usuários</Nav.Link>
                            )}
                            <Nav.Link as={Link} to="/financeiro">💰 Financeiro</Nav.Link>
                            {(userRole === 'admin' || userRole === 'gestor') && (
                                <Nav.Link as={Link} to="/configuracoes">⚙️ Configurações</Nav.Link>
                            )}
                        </Nav>
                        <Nav> {/* Nova Nav para alinhar à direita (user info e logout) */}
                            <div className="user-info-header d-flex flex-column justify-content-center text-white me-3">
                                <span id="logged-in-user-name">{user.nome_usuario}</span>
                                <span id="logged-in-user-email" className="text-sm text-gray-400">{user.email}</span>
                            </div>
                            <Button variant="secondary" onClick={logout}>Sair</Button>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            <main className="main-content">
                {children}
            </main>
        </Container>
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