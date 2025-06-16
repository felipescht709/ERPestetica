import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
// Importe componentes do react-bootstrap
import { Container, Row, Col, Card, Spinner, Alert, ListGroup } from 'react-bootstrap';

const HomePage = () => {
    const [stats, setStats] = useState(null);
    const [recentAppointments, setRecentAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user, userRole } = useContext(AuthContext);

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                setLoading(true);
                setError(null);

                const statsData = await api('/home', { method: 'GET' });
                setStats(statsData);

                const today = new Date();
                const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
                const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

                const appointmentsData = await api(`/agendamentos/range?start=${startOfDay}&end=${endOfDay}`, { method: 'GET' });
                setRecentAppointments(appointmentsData);

            } catch (err) {
                console.error('Erro ao carregar dados do dashboard:', err);
                setError(err.message || 'Erro ao carregar dados do dashboard.');
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();
    }, []);

    const getStatusColorClass = (status) => {
        switch (status) {
            case 'agendado': return 'bg-primary';
            case 'em_andamento': return 'bg-warning text-dark';
            case 'concluido': return 'bg-success';
            case 'cancelado': return 'bg-danger';
            case 'pendente': return 'bg-secondary';
            default: return 'bg-info';
        }
    };

    const getStatusText = (status) => {
        const statusMap = {
            'agendado': 'Agendado',
            'em_andamento': 'Em Andamento',
            'concluido': 'Concluído',
            'cancelado': 'Cancelado',
            'pendente': 'Pendente',
            // Adicione outras traduções conforme necessário
        };
        return statusMap[status] || status;
    };

    if (loading) {
        return (
            <Container className="d-flex justify-content-center align-items-center min-vh-100">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Carregando...</span>
                </Spinner>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="my-4">
                <Alert variant="danger">
                    <Alert.Heading>Erro ao Carregar Dashboard</Alert.Heading>
                    <p>{error}</p>
                </Alert>
            </Container>
        );
    }

    return (
        <Container fluid className="my-4"> {/* Use Container fluid para ocupar a largura total */}
            <h1 className="mb-4">Bem-vindo, {user?.nome_usuario || 'Usuário'}! 👋</h1>

            {/* Seção de Cards de Estatísticas */}
            <Row className="mb-4">
                <Col xs={12} md={6} lg={3} className="mb-3">
                    <Card className="h-100"> {/* h-100 para cards de mesma altura */}
                        <Card.Body>
                            <Card.Title>📊 Agendamentos Hoje</Card.Title>
                            <Card.Text className="fs-3 fw-bold">
                                {stats?.agendamentosHoje || 0}
                            </Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xs={12} md={6} lg={3} className="mb-3">
                    <Card className="h-100">
                        <Card.Body>
                            <Card.Title>💰 Faturamento Mês</Card.Title>
                            <Card.Text className="fs-3 fw-bold">
                                R$ {stats?.faturamentoMes?.toFixed(2) || '0.00'}
                            </Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xs={12} md={6} lg={3} className="mb-3">
                    <Card className="h-100">
                        <Card.Body>
                            <Card.Title>👥 Clientes Cadastrados</Card.Title>
                            <Card.Text className="fs-3 fw-bold">
                                {stats?.totalClientes || 0}
                            </Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xs={12} md={6} lg={3} className="mb-3">
                    <Card className="h-100">
                        <Card.Body>
                            <Card.Title>🛠️ Serviços Mais Vendidos</Card.Title>
                            <Card.Text className="fs-3 fw-bold">
                                {stats?.servicoMaisVendido || 'Nenhum'}
                            </Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Seção de Próximos Agendamentos */}
            <Row>
                <Col xs={12}>
                    <Card>
                        <Card.Header><h3 className="card-title mb-0">Próximos Agendamentos (Hoje)</h3></Card.Header>
                        <ListGroup variant="flush">
                            {recentAppointments.length === 0 ? (
                                <ListGroup.Item className="text-center text-muted py-4">Nenhum agendamento para hoje.</ListGroup.Item>
                            ) : (
                                recentAppointments.map(app => (
                                    <ListGroup.Item key={app.cod_agendamento} className="d-flex justify-content-between align-items-center">
                                        <div>
                                            <p className="fw-bold mb-1">{app.cliente_nome}</p>
                                            <p className="text-muted mb-0">{app.servico_nome} - {app.veiculo_modelo} ({app.veiculo_placa})</p>
                                        </div>
                                        <div className="text-end">
                                            <p className="fw-bold mb-1">{new Date(app.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                            <span className={`badge ${getStatusColorClass(app.status)}`}>
                                                {getStatusText(app.status)}
                                            </span>
                                        </div>
                                    </ListGroup.Item>
                                ))
                            )}
                        </ListGroup>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default HomePage;