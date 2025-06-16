// frontend/src/pages/ServicesPage.jsx
import React, { useState, useEffect, useCallback, useContext } from 'react';
import api from '../utils/api'; // Sua função para chamadas de API autenticadas
import { AuthContext } from '../context/AuthContext';
import {
    Container, Row, Col, Button, Modal, Form,
    Table, Spinner, Alert, Card
} from 'react-bootstrap';

const ServicesPage = () => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null); // Para erros de carregamento/permissão
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentService, setCurrentService] = useState({
        cod_servico: null, // Será preenchido para edição
        nome_servico: '',
        descricao_servico: '',
        duracao_minutos: '', // Será convertido para number
        preco: '',           // Será convertido para number
        categoria: '',
        ativo: true,         // Boolean
        custo_material: '',  // Será convertido para number
        custo_mao_de_obra: '', // Será convertido para number
        garantia_dias: '',   // Será convertido para number
        observacoes_internas: '',
        imagem_url: '',
        ordem_exibicao: '', // Será convertido para number
        requer_aprovacao: false, // Boolean
    });
    const [message, setMessage] = useState(null); // Para mensagens de sucesso/erro do formulário no modal ou página

    const { userRole } = useContext(AuthContext);
    const canManageServices = ['admin', 'gerente'].includes(userRole);

    const fetchServices = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api('/servicos', { method: 'GET' });
            setServices(data);
        } catch (err) {
            console.error('Erro ao buscar serviços:', err);
            setError(err.message || 'Erro ao carregar serviços.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (canManageServices) {
            fetchServices();
        } else {
            setLoading(false);
            setError('Você não tem permissão para gerenciar serviços.');
        }
    }, [fetchServices, canManageServices]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setCurrentService(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const openCreateModal = () => {
        setIsEditing(false);
        setCurrentService({
            cod_servico: null,
            nome_servico: '',
            descricao_servico: '',
            duracao_minutos: '',
            preco: '',
            categoria: '',
            ativo: true,
            custo_material: '',
            custo_mao_de_obra: '',
            garantia_dias: '',
            observacoes_internas: '',
            imagem_url: '',
            ordem_exibicao: '',
            requer_aprovacao: false,
        });
        setShowModal(true);
        setMessage(null); // Limpa mensagens anteriores ao abrir modal
        setError(null); // Limpa erros anteriores ao abrir modal
    };

    const openEditModal = (service) => {
        setIsEditing(true);
        setCurrentService({
            ...service,
            // Certifique-se que campos numéricos ou booleanos vêm formatados para o input ou com fallback para string vazia
            duracao_minutos: service.duracao_minutos || '',
            preco: service.preco || '',
            custo_material: service.custo_material || '',
            custo_mao_de_obra: service.custo_mao_de_obra || '',
            garantia_dias: service.garantia_dias || '',
            ordem_exibicao: service.ordem_exibicao || '',
            ativo: service.ativo ?? true, // Usa nullish coalescing para booleans
            requer_aprovacao: service.requer_aprovacao ?? false,
        });
        setShowModal(true);
        setMessage(null); // Limpa mensagens anteriores ao abrir modal
        setError(null); // Limpa erros anteriores ao abrir modal
    };

    const closeModal = () => {
        setShowModal(false);
        setMessage(null); // Limpa mensagens ao fechar o modal
        setError(null); // Limpa erros ao fechar o modal
    };

   // frontend/src/pages/ServicesPage.jsx (apenas a função handleSubmit)

// ... (código existente da ServicesPage) ...

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        setError(null);

        try {
            const serviceToSave = { ...currentService };

            const safeParseFloat = (value) => {
                if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return null;
                const parsed = parseFloat(value);
                return isNaN(parsed) ? null : parsed;
            };

            const safeParseInt = (value) => {
                if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return null;
                const parsed = parseInt(value, 10);
                return isNaN(parsed) ? null : parsed;
            };

            serviceToSave.duracao_minutos = safeParseInt(serviceToSave.duracao_minutos);
            serviceToSave.preco = safeParseFloat(serviceToSave.preco);
            serviceToSave.custo_material = safeParseFloat(serviceToSave.custo_material);
            serviceToSave.custo_mao_de_obra = safeParseFloat(serviceToSave.custo_mao_de_obra);
            serviceToSave.garantia_dias = safeParseInt(serviceToSave.garantia_dias);
            serviceToSave.ordem_exibicao = safeParseInt(serviceToSave.ordem_exibicao);

            serviceToSave.ativo = serviceToSave.ativo ?? true;
            serviceToSave.requer_aprovacao = serviceToSave.requer_aprovacao ?? false;
            
            if (serviceToSave.descricao_servico.trim() === '') serviceToSave.descricao_servico = null;
            if (serviceToSave.observacoes_internas.trim() === '') serviceToSave.observacoes_internas = null;
            if (serviceToSave.imagem_url.trim() === '') serviceToSave.imagem_url = null;


            if (isEditing) {
                // REMOVA O JSON.stringify AQUI
                await api(`/servicos/${serviceToSave.cod_servico}`, { method: 'PUT', body: JSON.stringify( serviceToSave) });
                setMessage({ type: 'success', text: 'Serviço atualizado com sucesso!' });
            } else {
                // REMOVA O JSON.stringify AQUI
                await api('/servicos', { method: 'POST', body: JSON.stringify( serviceToSave) });
                setMessage({ type: 'success', text: 'Serviço adicionado com sucesso!' });
            }
            fetchServices();
            closeModal();
        } catch (err) {
            console.error('Erro ao salvar serviço:', err);
            setMessage({ type: 'danger', text: err.message || 'Erro ao salvar serviço. Verifique os dados e tente novamente.' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (cod_servico) => {
        if (window.confirm('Tem certeza que deseja deletar este serviço?')) {
            setLoading(true);
            setMessage(null);
            setError(null);
            try {
                await api(`/servicos/${cod_servico}`, { method: 'DELETE' });
                setMessage({ type: 'success', text: 'Serviço deletado com sucesso!' });
                fetchServices(); // Atualiza a lista
            } catch (err) {
                console.error('Erro ao deletar serviço:', err);
                setMessage({ type: 'danger', text: err.message || 'Erro ao deletar serviço. Tente novamente.' });
            } finally {
                setLoading(false);
            }
        }
    };

    // Renderização de carregamento, erro ou acesso negado
    if (loading) {
        return (
            <Container className="d-flex justify-content-center align-items-center min-vh-100">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Carregando serviços...</span>
                </Spinner>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="my-4">
                <Alert variant="danger">
                    <Alert.Heading>Erro de Acesso</Alert.Heading>
                    <p>{error}</p>
                </Alert>
            </Container>
        );
    }

    if (!canManageServices) {
        return (
            <Container className="my-4">
                <Alert variant="warning">
                    <Alert.Heading>Acesso Negado</Alert.Heading>
                    <p>Você não tem permissão para visualizar e gerenciar serviços.</p>
                </Alert>
            </Container>
        );
    }

    return (
        <Container fluid className="my-4">
            <Row className="mb-3 align-items-center">
                <Col>
                    <h1>⚙️ Gerenciar Serviços</h1>
                </Col>
                <Col xs="auto">
                    <Button variant="primary" onClick={openCreateModal}>
                        + Adicionar Novo Serviço
                    </Button>
                </Col>
            </Row>

            {message && (
                <Alert variant={message.type === 'success' ? 'success' : 'danger'}>
                    {message.text}
                </Alert>
            )}

            <Row>
                <Col xs={12}>
                    <Card>
                        <Card.Header><h3 className="card-title mb-0">Lista de Serviços</h3></Card.Header>
                        <Card.Body>
                            <div className="table-responsive"> {/* Para rolagem horizontal em telas pequenas */}
                                <Table striped bordered hover className="shadow-sm">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Nome</th>
                                            <th>Preço</th>
                                            <th>Duração (min)</th>
                                            <th>Categoria</th>
                                            <th>Ativo</th>
                                            <th>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {services.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="text-center text-muted py-3">Nenhum serviço cadastrado.</td>
                                            </tr>
                                        ) : (
                                            services.map((service) => (
                                                <tr key={service.cod_servico}>
                                                    <td>{service.cod_servico}</td>
                                                    <td>{service.nome_servico}</td>
                                                    <td>R$ {service.preco ? parseFloat(service.preco).toFixed(2).replace('.', ',') : '0,00'}</td>
                                                    <td>{service.duracao_minutos || 'N/A'}</td>
                                                    <td>{service.categoria}</td>
                                                    <td>
                                                        <span className={`badge ${service.ativo ? 'bg-success' : 'bg-danger'}`}>
                                                            {service.ativo ? 'Sim' : 'Não'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <Button variant="info" size="sm" className="me-2" onClick={() => openEditModal(service)}>
                                                            Editar
                                                        </Button>
                                                        <Button variant="danger" size="sm" onClick={() => handleDelete(service.cod_servico)}>
                                                            Excluir
                                                        </Button>
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

            {/* Modal de Adicionar/Editar Serviço */}
            <Modal show={showModal} onHide={closeModal} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{isEditing ? 'Editar Serviço' : 'Adicionar Novo Serviço'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {message && ( // Exibe mensagens dentro do modal também
                        <Alert variant={message.type === 'success' ? 'success' : 'danger'}>
                            {message.text}
                        </Alert>
                    )}
                    <Form onSubmit={handleSubmit}>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3" controlId="nome_servico">
                                    <Form.Label>Nome do Serviço:</Form.Label>
                                    <Form.Control type="text" name="nome_servico" value={currentService.nome_servico} onChange={handleInputChange} required />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3" controlId="categoria">
                                    <Form.Label>Categoria:</Form.Label>
                                    <Form.Control type="text" name="categoria" value={currentService.categoria} onChange={handleInputChange} required />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={4}>
                                <Form.Group className="mb-3" controlId="duracao_minutos">
                                    <Form.Label>Duração (minutos):</Form.Label>
                                    <Form.Control type="number" name="duracao_minutos" value={currentService.duracao_minutos} onChange={handleInputChange} required min="1" />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-3" controlId="preco">
                                    <Form.Label>Preço (R$):</Form.Label>
                                    <Form.Control type="number" step="0.01" name="preco" value={currentService.preco} onChange={handleInputChange} required min="0" />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-3" controlId="garantia_dias">
                                    <Form.Label>Garantia (dias):</Form.Label>
                                    <Form.Control type="number" name="garantia_dias" value={currentService.garantia_dias} onChange={handleInputChange} min="0" />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3" controlId="custo_material">
                                    <Form.Label>Custo Material (R$):</Form.Label>
                                    <Form.Control type="number" step="0.01" name="custo_material" value={currentService.custo_material} onChange={handleInputChange} min="0" />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3" controlId="custo_mao_de_obra">
                                    <Form.Label>Custo Mão de Obra (R$):</Form.Label>
                                    <Form.Control type="number" step="0.01" name="custo_mao_de_obra" value={currentService.custo_mao_de_obra} onChange={handleInputChange} min="0" />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Form.Group className="mb-3" controlId="descricao_servico">
                            <Form.Label>Descrição do Serviço:</Form.Label>
                            <Form.Control as="textarea" rows={2} name="descricao_servico" value={currentService.descricao_servico} onChange={handleInputChange} />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="observacoes_internas">
                            <Form.Label>Observações Internas:</Form.Label>
                            <Form.Control as="textarea" rows={2} name="observacoes_internas" value={currentService.observacoes_internas} onChange={handleInputChange} />
                        </Form.Group>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3" controlId="imagem_url">
                                    <Form.Label>URL da Imagem:</Form.Label>
                                    <Form.Control type="text" name="imagem_url" value={currentService.imagem_url} onChange={handleInputChange} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3" controlId="ordem_exibicao">
                                    <Form.Label>Ordem de Exibição:</Form.Label>
                                    <Form.Control type="number" name="ordem_exibicao" value={currentService.ordem_exibicao} onChange={handleInputChange} min="0" />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3" controlId="ativo">
                                    <Form.Check
                                        type="checkbox"
                                        label="Serviço Ativo"
                                        name="ativo"
                                        checked={currentService.ativo}
                                        onChange={handleInputChange}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3" controlId="requer_aprovacao">
                                    <Form.Check
                                        type="checkbox"
                                        label="Requer Aprovação do Gestor"
                                        name="requer_aprovacao"
                                        checked={currentService.requer_aprovacao}
                                        onChange={handleInputChange}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={closeModal}>
                                Cancelar
                            </Button>
                            <Button variant="primary" type="submit"> {/* Removido disabled={loading} pois o loading está no modal e pode desabilitar demais */}
                                {isEditing ? 'Salvar Alterações' : 'Adicionar Serviço'}
                            </Button>
                        </Modal.Footer>
                    </Form>
                </Modal.Body>
            </Modal>
        </Container>
    );
};

export default ServicesPage;