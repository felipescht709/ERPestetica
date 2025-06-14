// frontend/src/pages/Home.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api'; // Importa a função api

const HomePage = () => {
    const [stats, setStats] = useState(null);
    const [recentAppointments, setRecentAppointments] = useState([]);
    const [loading, setLoading] = useState(true); // Estado de carregamento
    const [error, setError] = useState(null); // Estado de erro
    const { user, userRole } = useContext(AuthContext); // Pega o usuário e a role do contexto

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                setLoading(true); // Começa a carregar
                setError(null); // Limpa erros anteriores

                // 1. Fetch de Estatísticas do Dashboard
                const statsData = await api('/home', { method: 'GET' }); // Chama a rota /api/home
                setStats(statsData);

                // 2. Fetch de Agendamentos Recentes (Hoje)
                const today = new Date();
                const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
                const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

                const appointmentsData = await api(`/agendamentos/range?start=${startOfDay}&end=${endOfDay}`, { method: 'GET' });
                setRecentAppointments(appointmentsData);

            } catch (err) {
                console.error('Erro ao carregar dados da Home:', err);
                // Exibe o erro na interface
                setError(`Erro ao carregar dados: ${err.message || 'Verifique sua conexão e tente novamente.'}`);
            } finally {
                setLoading(false); // Termina de carregar, mesmo se com erro
            }
        };

        // Verifica se o usuário e a role estão disponíveis antes de carregar os dados
        if (user && userRole) {
            loadDashboardData();
        }
        // Dependências: recarrega se o usuário ou a role mudarem (o que não deve ocorrer após o login)
    }, [user, userRole]); // Adicione user e userRole como dependências

    // Renderização condicional:
    if (loading) {
        return (
            <div id="home-content" className="section-content active">
                <p className="empty-state">Carregando dados da Home...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div id="home-content" className="section-content active">
                <p className="empty-state" style={{ color: 'red' }}>{error}</p>
                <p className="empty-state">Por favor, verifique o console do navegador e do backend para mais detalhes.</p>
            </div>
        );
    }

    // Se não há dados, mas não está carregando nem com erro (ex: backend retornou vazio)
    if (!stats) {
        return (
            <div id="home-content" className="section-content active">
                <p className="empty-state">Nenhum dado disponível para a Home. Verifique se há dados no banco de dados.</p>
            </div>
        );
    }

    // Funções auxiliares para status (podem ser movidas para um arquivo utils/helpers.js)
    const getStatusText = (status) => {
        switch (status) {
            case 'Confirmado': return 'Confirmado';
            case 'Em Andamento': return 'Em Andamento';
            case 'Pendente': return 'Pendente';
            case 'Concluído': return 'Concluído';
            case 'Cancelado': return 'Cancelado';
            default: return status;
        }
    };

    const getStatusColorClass = (status) => {
        switch (status) {
            case 'Confirmado': return 'status-confirmado';
            case 'Em Andamento': return 'status-em-andamento';
            case 'Pendente': return 'status-pendente';
            case 'Concluído': return 'status-concluido';
            case 'Cancelado': return 'status-cancelado';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div id="home-content" className="section-content active">
            <h2>Bem-vindo, {user?.nome_usuario || 'Usuário'}!</h2>
            <p>Esta é a página inicial da sua plataforma de gestão para **{user?.nome_empresa || 'Sua Empresa'}**.</p>
            <p>Seu papel: <strong>{userRole}</strong></p>
            <div id="home-stats" className="info-cards-grid mt-6">
                <div className="info-card">
                    <div className="flex-between-center">
                        <div>
                            <p className="info-card-title">Total de Clientes</p>
                            <p className="info-card-value">{stats.totalClientes}</p>
                        </div>
                        <div className="info-card-icon bg-blue-100">👤</div>
                    </div>
                </div>
                <div className="info-card">
                    <div className="flex-between-center">
                        <div>
                            <p className="info-card-title">Agendamentos Hoje</p>
                            <p className="info-card-value text-purple-600">{stats.agendamentosHoje}</p>
                        </div>
                        <div className="info-card-icon bg-purple-100">📅</div>
                    </div>
                </div>
                <div className="info-card">
                    <div className="flex-between-center">
                        <div>
                            <p className="info-card-title">Serviços Concluídos (Mês)</p>
                            <p className="info-card-value text-green-600">{stats.servicosConcluidosMes}</p>
                        </div>
                        <div className="info-card-icon bg-green-100">✅</div>
                    </div>
                </div>
                <div className="info-card">
                    <div className="flex-between-center">
                        <div>
                            <p className="info-card-title">Faturamento Mensal</p>
                            <p className="info-card-value text-blue-600">R$ {stats.faturamentoMensal}</p>
                        </div>
                        <div className="info-card-icon bg-blue-100">💲</div>
                    </div>
                </div>
                <div className="info-card">
                    <div className="flex-between-center">
                        <div>
                            <p className="info-card-title">Média Avaliações</p>
                            <p className="info-card-value text-yellow-600">{stats.mediaAvaliacoes} / 5</p>
                        </div>
                        <div className="info-card-icon bg-yellow-100">⭐</div>
                    </div>
                </div>
                <div className="info-card">
                    <div className="flex-between-center">
                        <div>
                            <p className="info-card-title">Total Avaliações</p>
                            <p className="info-card-value text-gray-600">{stats.totalAvaliacoes}</p>
                        </div>
                        <div className="info-card-icon bg-gray-100">📝</div>
                    </div>
                </div>
            </div>

            <div className="card mt-6">
                <h3 className="card-title">Próximos Agendamentos (Hoje)</h3>
                <div id="recent-appointments-list">
                    {recentAppointments.length === 0 ? (
                        <p className="empty-state" style={{ padding: '20px', marginBottom: '0' }}>Nenhum agendamento para hoje.</p>
                    ) : (
                        recentAppointments.map(app => (
                            <div key={app.cod_agendamento} className="list-item">
                                <div className="list-item-main-info">
                                    <p className="list-item-title">{app.cliente_nome}</p>
                                    <p className="list-item-subtitle">{app.servico_nome} - {app.veiculo_modelo} ({app.veiculo_placa})</p>
                                </div>
                                <div className="text-right">
                                    <p className="list-item-title">{new Date(app.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                    <span className={`status-badge ${getStatusColorClass(app.status)}`}>
                                        {getStatusText(app.status)}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default HomePage;