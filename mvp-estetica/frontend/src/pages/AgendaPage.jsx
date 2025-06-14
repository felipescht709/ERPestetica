// frontend/src/pages/AgendaPage.jsx
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css'; // Estilos padrão do Big Calendar
import 'moment/locale/pt-br'; // Importa o locale para português

import { AuthContext } from '../context/AuthContext';
import api from '../utils/api'; // Sua função para chamadas de API autenticadas
import AppointmentModal from '../components/AppointmentModal'; // O modal de agendamento

// ====================================================================
// Configuração do Moment.js e Localizer para Big Calendar (CRUCIAL)
// ====================================================================
// É vital que moment.locale() seja chamado ANTES de momentLocalizer(moment) para garantir que
// as traduções sejam carregadas.
moment.locale('pt-br'); // Define o locale globalmente para português

const localizer = momentLocalizer(moment);

// Definindo os formatos personalizados para o react-big-calendar
// Isso é crucial para horários 24h e formatos de data em português
localizer.formats = {
    // Formatos Básicos
    dateFormat: 'DD/MM', // Ex: 14/06
    dayFormat: 'ddd DD/MM', // Ex: Sex 14/06 - 'ddd' deve virar 'Dom', 'Seg', etc. com locale pt-br
    weekdayFormat: 'ddd', // Ex: Seg

    // Formatos de Cabeçalho para as Visualizações
    // Day/Week Header: 'Dia da semana, DD/MM'
    dayHeaderFormat: 'dddd, DD/MM', // Ex: Sexta-feira, 14/06
    // Week Header: 'Semana [número] - [data inicial da semana] - [data final da semana]'
    weekHeaderFormat: ({ start, end }, culture, local) => { // CORRIGIDO: usa { start, end }
        const weekNumber = moment(start).week(); // Obtém o número da semana
        const startOfWeek = local.format(start, 'DD/MM', culture);
        const endOfWeek = local.format(end, 'DD/MM', culture);
        return `Semana ${weekNumber} - ${startOfWeek} - ${endOfWeek}`;
    },
    // Month Header: 'Nome do Mês Ano'
    monthHeaderFormat: 'MMMM YYYY', // CORRIGIDO: Adicionado espaço entre Mês e Ano
    // Agenda Header: 'Data inicial - Data final'
    agendaHeaderFormat: ({ start, end }, culture, local) =>
        local.format(start, 'DD/MM/YYYY', culture) + ' - ' + local.format(end, 'DD/MM/YYYY', culture),
    // Cabeçalho para range de dias (usado em visualizações multi-dias ou ao selecionar um range)
    dayRangeHeaderFormat: ({ start, end }, culture, local) =>
      local.format(start, 'DD/MM', culture) + ' - ' + local.format(end, 'DD/MM', culture),


    // Slots de Tempo (horários na coluna lateral da Week/Day view)
    timeGutterFormat: (date, culture, local) => local.format(date, 'HH:mm', culture), // Ex: 08:00

    // Formatos de tempo para eventos
    eventTimeRangeFormat: ({ start, end }, culture, local) =>
        local.format(start, 'HH:mm', culture) + ' - ' + local.format(end, 'HH:mm', culture), // Ex: 09:00 - 10:00
    eventTimeRangeStartFormat: ({ start }, culture, local) => local.format(start, 'HH:mm', culture), // Ex: 09:00
    eventTimeRangeEndFormat: ({ end }, culture, local) => local.format(end, 'HH:mm', culture), // Ex: 10:00
};
// ====================================================================


const AgendaPage = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [currentViewDate, setCurrentViewDate] = useState(new Date()); // A data atual sendo visualizada
    const [currentView, setCurrentView] = useState('week'); // Visualização atual do calendário (month, week, day, agenda)

    const { userRole } = useContext(AuthContext);

    // Roles que podem adicionar/editar/excluir agendamentos
    // Adicione 'gestor' e 'tecnico' se essas roles também tiverem permissão para manipular agendamentos.
    const canManageAppointments = userRole && ['admin', 'gerente', 'gestor', 'atendente', 'tecnico'].includes(userRole);

    // Função para buscar agendamentos do backend
    const fetchAppointments = useCallback(async (start, end) => {
        try {
            setLoading(true);
            setError(null);
            const startDate = moment(start).toISOString();
            const endDate = moment(end).toISOString();

            const data = await api(`/agendamentos/range?start=${startDate}&end=${endDate}`, { method: 'GET' });

            const formattedEvents = data.map(app => ({
                id: app.cod_agendamento,
                title: `${app.servico_nome} - ${app.cliente_nome}`,
                start: new Date(app.data_hora_inicio),
                end: new Date(app.data_hora_fim),
                status: app.status,
                allDay: false,
                resource: app
            }));
            setEvents(formattedEvents);
        } catch (err) {
            console.error('Erro ao carregar agendamentos:', err);
            setError(`Erro ao carregar agendamentos: ${err.message || 'Verifique sua conexão e tente novamente.'}`);
        } finally {
            setLoading(false);
        }
    }, []); // Este useCallback não depende de currentViewDate ou currentView, ele só executa a busca.

    // Efeito para carregar os agendamentos sempre que a data de visualização ou a view mudar
    useEffect(() => {
        const startOfPeriod = moment(currentViewDate).startOf(currentView).toDate();
        const endOfPeriod = moment(currentViewDate).endOf(currentView).toDate();
        fetchAppointments(startOfPeriod, endOfPeriod);
    }, [currentViewDate, currentView, fetchAppointments]); // Agora as dependências estão corretas para disparar re-fetch


    // Handler para quando o usuário seleciona um evento existente
    const handleSelectEvent = useCallback((event) => {
        setSelectedAppointment(event.resource); // Define o agendamento completo para o modal
        setShowModal(true); // Abre o modal
    }, []);

    // Handler para quando o usuário seleciona um slot de tempo vazio no calendário
    const handleSelectSlot = useCallback(({ start, end }) => {
        if (!canManageAppointments) {
            alert('Você não tem permissão para criar agendamentos.');
            return;
        }
        setSelectedAppointment({
            data_hora_inicio: start.toISOString(),
            data_hora_fim: end.toISOString(),
            duracao_minutos: moment(end).diff(moment(start), 'minutes'), // Calcula a duração padrão
            status: 'Pendente' // Status padrão para novo agendamento
        });
        setShowModal(true);
    }, [canManageAppointments]);

    // Handler para quando o usuário move ou redimensiona um evento existente
    const handleEventMoveResize = useCallback(async ({ event, start, end, isAllDay }) => {
        if (!canManageAppointments) {
            alert('Você não tem permissão para mover/redimensionar agendamentos.');
            // Recarrega para reverter visualmente a mudança não autorizada
            fetchAppointments(moment(currentViewDate).startOf(currentView).toDate(), moment(currentViewDate).endOf(currentView).toDate());
            return;
        }
        if (!window.confirm(`Tem certeza que deseja mover/redimensionar o agendamento de "${event.title}"?`)) {
            // Recarrega para reverter se o usuário cancelar a confirmação
            fetchAppointments(moment(currentViewDate).startOf(currentView).toDate(), moment(currentViewDate).endOf(currentView).toDate());
            return;
        }

        try {
            const updatedAppointmentData = {
                ...event.resource, // Dados originais do agendamento
                data_hora_inicio: start.toISOString(),
                data_hora_fim: end.toISOString(),
                duracao_minutos: moment(end).diff(moment(start), 'minutes'), // Recalcula duração
                cod_agendamento: undefined // Não enviar o ID no body para o PUT
            };

            // Remove propriedades que o backend não precisa ou não são atualizáveis via PUT
            delete updatedAppointmentData.cliente_nome;
            delete updatedAppointmentData.servico_nome;
            delete updatedAppointmentData.veiculo_marca;
            delete updatedAppointmentData.veiculo_modelo;
            delete updatedAppointmentData.veiculo_cor;
            delete updatedAppointmentData.veiculo_placa;
            delete updatedAppointmentData.usuario_responsavel_nome;


            await api(`/agendamentos/${event.id}`, {
                method: 'PUT',
                body: updatedAppointmentData,
            });
            alert('Agendamento atualizado com sucesso!');
            // Re-fetch agendamentos para atualizar o calendário
            fetchAppointments(moment(currentViewDate).startOf(currentView).toDate(), moment(currentViewDate).endOf(currentView).toDate());
        } catch (err) {
            console.error('Erro ao mover/redimensionar agendamento:', err);
            alert(`Erro ao atualizar agendamento: ${err.message}`);
            // Reverte a alteração visual se a API falhar
            fetchAppointments(moment(currentViewDate).startOf(currentView).toDate(), moment(currentViewDate).endOf(currentView).toDate());
        }
    }, [canManageAppointments, fetchAppointments, currentViewDate, currentView]);


    // Handler para quando o usuário clica nas setas "Anterior", "Próximo" ou "Hoje"
    const handleNavigate = useCallback((newDate) => {
        setCurrentViewDate(newDate); // Atualiza o estado da data, o que dispara o useEffect de fetch
    }, []);

    // Handler para quando o usuário clica nos botões de visualização (Mês, Semana, Dia, Lista)
    const handleViewChange = useCallback((newView) => {
        setCurrentView(newView); // Atualiza o estado da visualização, o que dispara o useEffect de fetch
    }, []);

    // Estilização condicional dos eventos no calendário com base no status
    const eventPropGetter = useCallback((event, start, end, isSelected) => {
        let classNames = [];
        switch (event.status) {
            case 'Pendente': classNames.push('rbc-event-pending'); break;
            case 'Confirmado': classNames.push('rbc-event-confirmed'); break;
            case 'Em Andamento': classNames.push('rbc-event-inprogress'); break;
            case 'Concluído': classNames.push('rbc-event-completed'); break;
            case 'Cancelado': classNames.push('rbc-event-cancelled'); break;
            default: break;
        }
        return { className: classNames.join(' ') };
    }, []);

    return (
        <div id="agenda-content" className="section-content active">
            <h2>Agenda de Agendamentos</h2>
            {loading && <p className="empty-state">Carregando agenda...</p>}
            {error && <p className="empty-state" style={{ color: 'red' }}>{error}</p>}
            {!loading && !error && (
                <div style={{ height: '700px', margin: '20px 0' }}>
                    <Calendar
                        localizer={localizer}
                        events={events}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: '100%' }}
                        selectable={canManageAppointments}
                        resizable={canManageAppointments}
                        draggableAccessor={canManageAppointments}
                        // === MUITO IMPORTANTE: PROPS CONTROLADAS PARA A DATA E A VISUALIZAÇÃO ===
                        date={currentViewDate} // Passa o estado da data para o calendário
                        view={currentView}     // Passa o estado da visualização para o calendário
                        // =====================================================================
                        onSelectEvent={handleSelectEvent}
                        onSelectSlot={handleSelectSlot}
                        onEventDrop={handleEventMoveResize}
                        onEventResize={handleEventMoveResize}
                        onNavigate={handleNavigate} // Conecta ao handler que atualiza currentViewDate
                        onView={handleViewChange}   // Conecta ao handler que atualiza currentView
                        eventPropGetter={eventPropGetter}
                        messages={{ // Mensagens traduzidas para português
                            allDay: 'Dia Inteiro',
                            previous: 'Anterior',
                            next: 'Próximo',
                            today: 'Hoje',
                            month: 'Mês',
                            week: 'Semana',
                            day: 'Dia',
                            agenda: 'Lista',
                            date: 'Data',
                            time: 'Hora',
                            event: 'Evento',
                            noEventsInRange: 'Nenhum agendamento neste período.',
                            showMore: total => `+ Ver mais (${total})`
                        }}
                    />
                </div>
            )}

            {showModal && (
                <AppointmentModal
                    appointment={selectedAppointment}
                    onClose={() => {
                        setShowModal(false);
                        setSelectedAppointment(null);
                    }}
                    onSave={() => {
                        setShowModal(false);
                        setSelectedAppointment(null);
                        // Re-fetch agendamentos após salvar para atualizar a visualização
                        fetchAppointments(moment(currentViewDate).startOf(currentView).toDate(), moment(currentViewDate).endOf(currentView).toDate());
                    }}
                />
            )}
        </div>
    );
};

export default AgendaPage;