// frontend/src/pages/FinanceiroPage.jsx
import React, { useState, useEffect, useCallback, useContext } from 'react';
import api from '../utils/api'; // Sua função para chamadas de API autenticadas
import { AuthContext } from '../context/AuthContext';
import {
    Container, Row, Col, Card, Form, Button,
    Table, Spinner, Alert
} from 'react-bootstrap';
import moment from 'moment'; // Para manipulação de datas

const FinanceiroPage = () => {
    const { userRole } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [summary, setSummary] = useState({
        totalRevenue: 0,
        totalCost: 0,
        grossProfit: 0,
    });
    const [transactions, setTransactions] = useState([]);
    // Define o período inicial como o mês atual
    const [startDate, setStartDate] = useState(moment().startOf('month').format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(moment().endOf('month').format('YYYY-MM-DD'));

    const canViewFinance = ['admin', 'gerente'].includes(userRole);

    const fetchFinancialData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Requisição para o resumo financeiro
            // ATENÇÃO: Você precisará criar a rota /api/financeiro/resumo no seu backend!
            const summaryData = await api(`/financeiro/resumo?startDate=${startDate}&endDate=${endDate}`, { method: 'GET' });
            setSummary({
                totalRevenue: parseFloat(summaryData.total_revenue) || 0,
                totalCost: (parseFloat(summaryData.total_material_cost) || 0) + (parseFloat(summaryData.total_labor_cost) || 0),
                grossProfit: (parseFloat(summaryData.total_revenue) || 0) - ((parseFloat(summaryData.total_material_cost) || 0) + (parseFloat(summaryData.total_labor_cost) || 0)),
            });

            // Requisição para as transações detalhadas (agendamentos concluídos)
            // A rota de agendamentos deve ser capaz de filtrar por status
            const transactionsData = await api(`/agendamentos/range?start=${startDate}T00:00:00.000Z&end=${endDate}T23:59:59.999Z&status=concluido`, { method: 'GET' });
            setTransactions(transactionsData);

        } catch (err) {
            console.error('Erro ao buscar dados financeiros:', err);
            setError(err.message || 'Erro ao carregar dados financeiros.');
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]); // Re-executa quando as datas de início/fim mudam

    useEffect(() => {
        if (canViewFinance) {
            fetchFinancialData();
        } else {
            setLoading(false);
            setError('Você não tem permissão para acessar esta página.');
        }
    }, [fetchFinancialData, canViewFinance]); // Re-executa quando a função de fetch ou permissões mudam

    // Renderização condicional para estados de carregamento, erro ou acesso negado
    if (loading) {
        return (
            <Container className="d-flex justify-content-center align-items-center min-vh-100">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Carregando dados financeiros...</span>
                </Spinner>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="my-4">
                <Alert variant="danger">
                    <Alert.Heading>Erro ao Carregar Financeiro</Alert.Heading>
                    <p>{error}</p>
                </Alert>
            </Container>
        );
    }

    if (!canViewFinance) {
        return (
            <Container className="my-4">
                <Alert variant="warning">
                    <Alert.Heading>Acesso Negado</Alert.Heading>
                    <p>Você não tem permissão para visualizar esta página.</p>
                </Alert>
            </Container>
        );
    }

    return (
        <Container fluid className="my-4">
            <Row className="mb-3 align-items-center">
                <Col>
                    <h1>💰 Controle Financeiro</h1>
                </Col>
            </Row>

            {/* Filtros de Data */}
            <Card className="mb-4 shadow-sm">
                <Card.Header><h4 className="card-title mb-0">Filtrar por Período</h4></Card.Header>
                <Card.Body>
                    <Form>
                        <Row className="align-items-end">
                            <Col md={5} className="mb-3 mb-md-0">
                                <Form.Group controlId="startDate">
                                    <Form.Label>Data de Início:</Form.Label>
                                    <Form.Control
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={5} className="mb-3 mb-md-0">
                                <Form.Group controlId="endDate">
                                    <Form.Label>Data de Fim:</Form.Label>
                                    <Form.Control
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={2}>
                                <Button variant="primary" onClick={fetchFinancialData} className="w-100">
                                    Aplicar Filtro
                                </Button>
                            </Col>
                        </Row>
                    </Form>
                </Card.Body>
            </Card>

            {/* Resumo Financeiro */}
            <Row className="mb-4">
                <Col md={4} className="mb-3">
                    <Card className="text-center bg-primary text-white h-100 shadow-sm">
                        <Card.Body>
                            <Card.Title className="fs-5">Receita Total</Card.Title>
                            <Card.Text className="fs-2 fw-bold">
                                R$ {summary.totalRevenue.toFixed(2).replace('.', ',')}
                            </Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4} className="mb-3">
                    <Card className="text-center bg-danger text-white h-100 shadow-sm">
                        <Card.Body>
                            <Card.Title className="fs-5">Custo Total de Serviços</Card.Title>
                            <Card.Text className="fs-2 fw-bold">
                                R$ {summary.totalCost.toFixed(2).replace('.', ',')}
                            </Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4} className="mb-3">
                    <Card className="text-center bg-success text-white h-100 shadow-sm">
                        <Card.Body>
                            <Card.Title className="fs-5">Lucro Bruto</Card.Title>
                            <Card.Text className="fs-2 fw-bold">
                                R$ {summary.grossProfit.toFixed(2).replace('.', ',')}
                            </Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Detalhes das Transações */}
            <Row>
                <Col xs={12}>
                    <Card className="shadow-sm">
                        <Card.Header><h4 className="card-title mb-0">Transações Concluídas ({moment(startDate).format('DD/MM/YYYY')} - {moment(endDate).format('DD/MM/YYYY')})</h4></Card.Header>
                        <Card.Body>
                            <div className="table-responsive">
                                <Table striped bordered hover className="mb-0">
                                    <thead>
                                        <tr>
                                            <th>Data/Hora</th>
                                            <th>Cliente</th>
                                            <th>Serviço</th>
                                            <th>Preço Total</th>
                                            <th>Forma Pagamento</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="text-center text-muted py-3">Nenhuma transação encontrada no período selecionado.</td>
                                            </tr>
                                        ) : (
                                            transactions.map((transaction) => (
                                                <tr key={transaction.cod_agendamento}>
                                                    <td>{moment(transaction.data_hora_fim).format('DD/MM/YYYY HH:mm')}</td>
                                                    <td>{transaction.cliente_nome}</td> {/* Assumindo que o backend pode retornar `cliente_nome` via JOIN */}
                                                    <td>{transaction.servico_nome}</td> {/* Assumindo que o backend pode retornar `servico_nome` via JOIN */}
                                                    <td>R$ {parseFloat(transaction.preco_total).toFixed(2).replace('.', ',')}</td>
                                                    <td>{transaction.forma_pagamento || 'N/A'}</td>
                                                    <td>
                                                        <span className={`badge bg-${transaction.status === 'concluido' ? 'success' : 'secondary'}`}>
                                                            {transaction.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </Table>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default FinanceiroPage;