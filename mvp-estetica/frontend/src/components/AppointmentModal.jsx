// frontend/src/components/AppointmentModal.jsx
import React, { useState, useEffect } from 'react';
import api from '../utils/api'; // Sua função para chamadas de API autenticadas
import moment from 'moment'; // Necessário para formatação de datas

const AppointmentModal = ({ appointment, onClose, onSave }) => {
    // Estado para os campos do formulário do agendamento
    const [formData, setFormData] = useState({
        cod_agendamento: appointment?.resource?.cod_agendamento || appointment?.id || null, // `appointment.id` para novos slots
        cliente_cod: appointment?.resource?.cliente_cod || '',
        servico_cod: appointment?.resource?.servico_cod || '',
        veiculo_cod: appointment?.resource?.veiculo_cod || '',
        usuario_responsavel_cod: appointment?.resource?.usuario_responsavel_cod || '',
        data: appointment?.start ? moment(appointment.start).format('YYYY-MM-DD') : '',
        hora: appointment?.start ? moment(appointment.start).format('HH:mm') : '',
        // Ajusta a duração para um valor default se for um slot vazio, ou usa a do evento
        duracao_minutos: appointment?.resource?.duracao_minutos || (appointment?.end ? moment(appointment.end).diff(moment(appointment.start), 'minutes') : 60), // Default 60 min para novo slot
        preco_total: appointment?.resource?.preco_total || '',
        status: appointment?.resource?.status || 'Pendente',
        tipo_agendamento: appointment?.resource?.tipo_agendamento || 'Online',
        forma_pagamento: appointment?.resource?.forma_pagamento || 'Cartão',
        observacoes_agendamento: appointment?.resource?.observacoes_agendamento || ''
    });

    // Estados para carregar dados dos dropdowns (clientes, serviços, veículos, usuários)
    const [clients, setClients] = useState([]);
    const [services, setServices] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [users, setUsers] = useState([]); // Usuários para serem responsáveis
    const [loadingDropdowns, setLoadingDropdowns] = useState(true);
    const [errorDropdowns, setErrorDropdowns] = useState(null);

    // Efeito para carregar os dados dos dropdowns na montagem do modal
    useEffect(() => {
        const fetchDropdownData = async () => {
            try {
                setLoadingDropdowns(true);
                setErrorDropdowns(null);

                // Fetch Clientes
                const clientsData = await api('/clientes', { method: 'GET' });
                setClients(clientsData);

                // Fetch Serviços
                const servicesData = await api('/servicos', { method: 'GET' });
                setServices(servicesData);

                // Fetch Usuários (para selecionar o responsável)
                // Você pode precisar de uma rota de backend para filtrar por roles como 'tecnico' ou 'atendente'
                // ou filtrar no frontend como abaixo
                const usersData = await api('/usuarios', { method: 'GET' });
                setUsers(usersData);

            } catch (err) {
                console.error('Erro ao carregar dados para dropdowns:', err);
                setErrorDropdowns(`Erro ao carregar opções: ${err.message || 'Verifique sua conexão e tente novamente.'}`);
            } finally {
                setLoadingDropdowns(false);
            }
        };

        fetchDropdownData();
    }, []);

    // Efeito para carregar veículos do cliente selecionado
    useEffect(() => {
        if (formData.cliente_cod) {
            const fetchVehiclesByClient = async () => {
                try {
                    // Chame a rota do backend para obter veículos por cliente
                    // Exemplo: /api/veiculos?cliente_cod=123 (você precisará implementar esta rota)
                    const vehicleData = await api(`/veiculos/cliente/${formData.cliente_cod}`, { method: 'GET' });
                    setVehicles(vehicleData);
                } catch (err) {
                    console.error('Erro ao carregar veículos do cliente:', err);
                    setVehicles([]); // Limpa veículos se houver erro ou não encontrar
                }
            };
            fetchVehiclesByClient();
        } else {
            setVehicles([]); // Limpa veículos se nenhum cliente estiver selecionado
        }
    }, [formData.cliente_cod]);

    // Efeito para preencher duração e preço do serviço ao selecionar um serviço
    useEffect(() => {
        const selectedService = services.find(s => s.cod_servico === parseInt(formData.servico_cod));
        if (selectedService) {
            setFormData(prev => ({
                ...prev,
                // Só preenche se o campo ainda não tiver sido editado ou se for um novo agendamento
                duracao_minutos: prev.duracao_minutos || selectedService.duracao_minutos,
                preco_total: prev.preco_total || selectedService.preco,
            }));
        }
    }, [formData.servico_cod, services]);


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Validação básica
        if (!formData.cliente_cod || !formData.servico_cod || !formData.data || !formData.hora || !formData.duracao_minutos || !formData.preco_total) {
            alert('Por favor, preencha todos os campos obrigatórios (Cliente, Serviço, Data, Hora, Duração, Preço).');
            return;
        }

        try {
            const payload = { ...formData };
            delete payload.cod_agendamento; // Não enviar o ID no body para PUT/POST

            let response;
            if (appointment?.cod_agendamento) { // Modo de edição
                response = await api(`/agendamentos/${appointment.cod_agendamento}`, {
                    method: 'PUT',
                    body: payload,
                });
                alert('Agendamento atualizado com sucesso!');
            } else { // Modo de criação
                response = await api('/agendamentos', {
                    method: 'POST',
                    body: payload,
                });
                alert('Agendamento criado com sucesso!');
            }
            onSave(); // Chama a função de callback para fechar o modal e recarregar a agenda
        } catch (err) {
            console.error('Erro ao salvar agendamento:', err);
            alert(`Erro ao salvar agendamento: ${err.message || 'Verifique sua conexão e tente novamente.'}`);
        }
    };

    // Renderiza uma mensagem de carregamento ou erro se os dropdowns não carregarem
    if (loadingDropdowns) {
        return (
            <div className="modal-backdrop"> {/* ESTE É O ELEMENTO QUE NÃO ESTAVA APARECENDO! */}
                <div className="modal-content">
                    <p className="empty-state">Carregando opções de agendamento...</p>
                </div>
            </div>
        );
    }

    if (errorDropdowns) {
        return (
            <div className="modal-backdrop"> {/* ESTE É O ELEMENTO QUE NÃO ESTAVA APARECENDO! */}
                <div className="modal-content">
                    <p className="empty-state" style={{ color: 'red' }}>{errorDropdowns}</p>
                    <button onClick={onClose} className="button-secondary mt-4">Fechar</button>
                </div>
            </div>
        );
    }

    // Renderiza o formulário completo do modal
    return (
        <div className="modal-backdrop"> {/* ESTE É O ELEMENTO QUE NÃO ESTAVA APARECENDO! */}
            <div className="modal-content">
                <h3>{appointment?.cod_agendamento ? 'Editar Agendamento' : 'Novo Agendamento'}</h3>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="cliente_cod">Cliente:</label>
                        <select name="cliente_cod" id="cliente_cod" value={formData.cliente_cod} onChange={handleChange} required className="input-field">
                            <option value="">Selecione um Cliente</option>
                            {clients.map(client => (
                                <option key={client.cod_cliente} value={client.cod_cliente}>{client.nome_cliente}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="servico_cod">Serviço:</label>
                        <select name="servico_cod" id="servico_cod" value={formData.servico_cod} onChange={handleChange} required className="input-field">
                            <option value="">Selecione um Serviço</option>
                            {services.map(service => (
                                <option key={service.cod_servico} value={service.cod_servico}>{service.nome_servico} (R$ {parseFloat(service.preco).toFixed(2)})</option>
                            ))}
                        </select>
                    </div>

                    {/* Exibir veículos se um cliente estiver selecionado e houver veículos */}
                    {formData.cliente_cod && vehicles.length > 0 && (
                        <div className="form-group">
                            <label htmlFor="veiculo_cod">Veículo:</label>
                            <select name="veiculo_cod" id="veiculo_cod" value={formData.veiculo_cod} onChange={handleChange} className="input-field">
                                <option value="">Selecione um Veículo (Opcional)</option>
                                {vehicles.map(vehicle => (
                                    <option key={vehicle.cod_veiculo} value={vehicle.cod_veiculo}>{vehicle.marca} {vehicle.modelo} ({vehicle.placa})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="usuario_responsavel_cod">Responsável:</label>
                        <select name="usuario_responsavel_cod" id="usuario_responsavel_cod" value={formData.usuario_responsavel_cod} onChange={handleChange} className="input-field">
                            <option value="">Selecione um Responsável (Opcional)</option>
                            {users.filter(u => ['admin', 'gerente', 'atendente', 'tecnico', 'gestor'].includes(u.role)).map(user => ( // Inclua 'gestor' para aparecer na lista
                                <option key={user.cod_usuario} value={user.cod_usuario}>{user.nome_usuario} ({user.role})</option>
                            ))}
                        </select>
                    </div>

                    {/* Use uma div .form-row para agrupar campos half-width */}
                    <div className="form-row">
                        <div className="form-group half-width">
                            <label htmlFor="data">Data:</label>
                            <input type="date" name="data" id="data" value={formData.data} onChange={handleChange} required className="input-field" />
                        </div>
                        <div className="form-group half-width">
                            <label htmlFor="hora">Hora:</label>
                            <input type="time" name="hora" id="hora" value={formData.hora} onChange={handleChange} required className="input-field" />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group half-width">
                            <label htmlFor="duracao_minutos">Duração (minutos):</label>
                            <input type="number" name="duracao_minutos" id="duracao_minutos" value={formData.duracao_minutos} onChange={handleChange} required className="input-field" />
                        </div>
                        <div className="form-group half-width">
                            <label htmlFor="preco_total">Preço Total:</label>
                            <input type="number" step="0.01" name="preco_total" id="preco_total" value={formData.preco_total} onChange={handleChange} required className="input-field" />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="status">Status:</label>
                        <select name="status" id="status" value={formData.status} onChange={handleChange} required className="input-field">
                            <option value="Pendente">Pendente</option>
                            <option value="Confirmado">Confirmado</option>
                            <option value="Em Andamento">Em Andamento</option>
                            <option value="Concluído">Concluído</option>
                            <option value="Cancelado">Cancelado</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="tipo_agendamento">Tipo de Agendamento:</label>
                        <select name="tipo_agendamento" id="tipo_agendamento" value={formData.tipo_agendamento} onChange={handleChange} className="input-field">
                            <option value="Online">Online</option>
                            <option value="Telefone">Telefone</option>
                            <option value="Presencial">Presencial</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="forma_pagamento">Forma de Pagamento:</label>
                        <select name="forma_pagamento" id="forma_pagamento" value={formData.forma_pagamento} onChange={handleChange} className="input-field">
                            <option value="Cartão">Cartão</option>
                            <option value="Dinheiro">Dinheiro</option>
                            <option value="Pix">Pix</option>
                            <option value="Boleto">Boleto</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="observacoes_agendamento">Observações:</label>
                        <textarea name="observacoes_agendamento" id="observacoes_agendamento" value={formData.observacoes_agendamento} onChange={handleChange} className="input-field"></textarea>
                    </div>

                    <div className="modal-actions">
                        <button type="submit" className="button-primary">Salvar Agendamento</button>
                        <button type="button" className="button-secondary" onClick={onClose}>Cancelar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AppointmentModal;