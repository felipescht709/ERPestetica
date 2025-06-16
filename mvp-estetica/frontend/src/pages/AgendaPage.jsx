// frontend/src/pages/AgendaPage.jsx
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'moment/locale/pt-br';

import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import AppointmentModal from '../components/AppointmentModal';

// Importe componentes do react-bootstrap
import { Container, Row, Col, Button, Spinner, Alert } from 'react-bootstrap';

moment.locale('pt-br');
const localizer = momentLocalizer(moment);

localizer.formats = {
    dateFormat: 'DD/MM',
    dayFormat: 'ddd DD/MM',
    weekdayFormat: 'ddd',
    timeGutterFormat: 'HH:mm',
    eventTimeRangeFormat: ({ start, end }, culture, local) =>
        local.format(start, 'HH:mm', culture) + ' - ' + local.format(end, 'HH:mm', culture),
    eventTimeRangeStartFormat: ({ start }, culture, local) => local.format(start, 'HH:mm', culture) + ' - ',
    eventTimeRangeEndFormat: ({ end }, culture, local) => ' - ' + local.format(end, 'HH:mm', culture),
    selectRangeFormat: ({ start, end }, culture, local) =>
        local.format(start, 'DD/MM HH:mm', culture) + ' - ' + local.format(end, 'DD/MM HH:mm', culture),
    agendaDateFormat: 'ddd DD/MM',
    agendaTimeFormat: 'HH:mm',
    agendaTimeRangeFormat: ({ start, end }, culture, local) =>
        local.format(start, 'HH:mm', culture) + ' - ' + local.format(end, 'HH:mm', culture),
    monthHeaderFormat: 'MMMM YYYY',
    dayHeaderFormat: 'dddd, DD/MM',
    weekHeaderFormat: (momentA, momentB, culture, local) =>
        local.format(momentA, 'DD/MM', culture) + ' - ' + local.format(momentB, 'DD/MM', culture),
    dayRangeFormat: ({ start, end }, culture, local) =>
        local.format(start, 'DD/MM', culture) + ' - ' + local.format(end, 'DD/MM', culture),
};

const AgendaPage = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [currentView, setCurrentView] = useState('month'); // Estado para a view atual do calendário
    const [currentViewDate, setCurrentViewDate] = useState(new Date()); // Estado para a data atual do calendário

    const { userRole } = useContext(AuthContext);
    const canCreateEdit = ['admin', 'gerente', 'atendente', 'gestor'].includes(userRole);

    const fetchAppointments = useCallback(async (start, end) => {
        setLoading(true);
        setError(null);
        try {
            const data = await api(`/agendamentos/range?start=${start.toISOString()}&end=${end.toISOString()}`, { method: 'GET' });
            const formattedEvents = data.map(app => ({
                id: app.cod_agendamento,
                title: `${app.cliente_nome} - ${app.servico_nome}`,
                start: new Date(app.data_hora_inicio),
                end: new Date(app.data_hora_fim),
                allDay: false,
                resource: app, // Guarda o objeto original do agendamento aqui
            }));
            setEvents(formattedEvents);
        } catch (err) {
            console.error('Erro ao buscar agendamentos:', err);
            setError('Erro ao carregar agendamentos. Tente novamente.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Carrega agendamentos para o mês atual na montagem
        fetchAppointments(moment(currentViewDate).startOf('month').toDate(), moment(currentViewDate).endOf('month').toDate());
    }, [fetchAppointments, currentViewDate]);

    const handleSelectSlot = useCallback(({ start, end }) => {
        if (!canCreateEdit) {
            alert('Você não tem permissão para criar agendamentos.');
            return;
        }
        setSelectedAppointment({
            data_hora_inicio: start,
            data_hora_fim: end,
            status: 'agendado', // Default para novo agendamento
            // outros campos padrão para um novo agendamento
        });
        setShowModal(true);
    }, [canCreateEdit]);

    const handleSelectEvent = useCallback((event) => {
        setSelectedAppointment(event.resource); // Pega o objeto original
        setShowModal(true);
    }, []);

    const handleNavigate = useCallback((newDate, view, action) => {
        setCurrentViewDate(newDate);
        // Não é necessário buscar aqui, pois o useEffect já reage a `currentViewDate`
    }, []);

    const handleView = useCallback((newView) => {
        setCurrentView(newView);
        // Não é necessário buscar aqui, pois o useEffect já reage a `currentViewDate`
    }, []);

    if (loading) {
        return (
            <Container className="d-flex justify-content-center align-items-center min-vh-100">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Carregando agenda...</span>
                </Spinner>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="my-4">
                <Alert variant="danger">
                    <Alert.Heading>Erro ao Carregar Agenda</Alert.Heading>
                    <p>{error}</p>
                </Alert>
            </Container>
        );
    }

    return (
        <Container fluid className="my-4">
            <Row className="mb-3 align-items-center">
                <Col>
                    <h1>📅 Agenda de Agendamentos</h1>
                </Col>
                {canCreateEdit && (
                    <Col xs="auto">
                        <Button variant="primary" onClick={() => handleSelectSlot({ start: new Date(), end: new Date(new Date().setHours(new Date().getHours() + 1)) })}>
                            + Novo Agendamento
                        </Button>
                    </Col>
                )}
            </Row>
            <Row>
                <Col xs={12}>
                    <div style={{ height: '80vh' }} className="calendar-container shadow-sm p-3 bg-white rounded"> {/* Altura responsiva */}
                        <Calendar
                            localizer={localizer}
                            events={events}
                            startAccessor="start"
                            endAccessor="end"
                            selectable
                            onSelectEvent={handleSelectEvent}
                            onSelectSlot={handleSelectSlot}
                            onNavigate={handleNavigate}
                            onView={handleView}
                            view={currentView} // Controla a view com estado
                            date={currentViewDate} // Controla a data com estado
                            culture='pt-br'
                            messages={{
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
                </Col>
            </Row>

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
        </Container>
    );
};

export default AgendaPage;