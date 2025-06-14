// public/js/agenda.js

document.addEventListener('DOMContentLoaded', () => {
    const agendaContent = document.getElementById('agenda-content');
    if (agendaContent) {
        const dateInput = document.getElementById('agenda-date');
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
        dateInput.addEventListener('change', fetchAgendaAppointments);
        
        agendaContent.addEventListener('sectionActivated', fetchAgendaAppointments);
        // If agenda is the initial active section
        if (agendaContent.classList.contains('active')) {
            fetchAgendaAppointments();
        }
    }
});

function getStatusColorClass(status) {
    switch (status) {
        case 'confirmado': return 'status-confirmado';
        case 'em-andamento': return 'status-em-andamento';
        case 'pendente': return 'status-pendente';
        case 'concluido': return 'status-concluido';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'confirmado': return 'Confirmado';
        case 'em-andamento': return 'Em Andamento';
        case 'pendente': return 'Pendente';
        case 'concluido': return 'Concluído';
        default: return status;
    }
}

async function fetchAgendaAppointments() {
    const dateInput = document.getElementById('agenda-date');
    const selectedDate = dateInput.value; // Format: YYYY-MM-DD
    const agendaList = document.getElementById('agenda-appointments-list');

    try {
        const response = await fetch(`http://localhost:3001/api/agendamentos/date/${selectedDate}`);
        const appointmentsForSelectedDate = await response.json();

        if (appointmentsForSelectedDate.length === 0) {
            agendaList.innerHTML = '<p class="empty-state">Nenhum agendamento para esta data.</p>';
            return;
        }

        agendaList.innerHTML = appointmentsForSelectedDate.map(app => `
            <div class="card list-item">
                <div class="flex-between-center" style="align-items: flex-start;">
                    <div class="flex-1">
                        <div class="flex items-center space-x-4 mb-3">
                            <span class="text-lg font-semibold text-gray-900">⏰ ${app.hora.substring(0, 5)}</span>
                            <span class="status-badge ${getStatusColorClass(app.status)}">
                                ${getStatusText(app.status)}
                            </span>
                        </div>
                        
                        <div class="agenda-appointment-details">
                            <div>
                                <span>👤 ${app.cliente_nome}</span>
                            </div>
                            <div>
                                <span>📞 ${app.cliente_telefone}</span>
                            </div>
                            <div>
                                <span>🚗 ${app.veiculo_modelo ? `${app.veiculo_modelo} ${app.veiculo_cor ? `- ${app.veiculo_cor}` : ''}` : 'N/A'}</span>
                            </div>
                            <div>
                                <span>${app.servico_nome}</span>
                            </div>
                        </div>
                        
                        <div class="flex-between-center agenda-actions" style="justify-content: flex-end; margin-top: 16px;">
                            <div class="text-sm text-gray-600">
                                <span>Duração: ${app.duracao_minutos} min</span>
                                <span style="margin-left: 16px;">Valor: R$ ${parseFloat(app.preco_total).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div class="flex space-x-2">
                                <button class="button-primary edit-button" data-id="${app.id}">Editar</button>
                                <button class="button-primary complete-button" data-id="${app.id}" data-current-status="${app.status}">Concluir</button>
                                <button class="button-primary delete-button" data-id="${app.id}">Excluir</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Add event listeners for buttons (Editar, Concluir, Excluir)
        agendaList.querySelectorAll('.complete-button').forEach(button => {
            button.addEventListener('click', async (event) => {
                const appointmentId = event.target.dataset.id;
                const currentStatus = event.target.dataset.currentStatus;
                if (currentStatus !== 'concluido' && confirm(`Tem certeza que deseja marcar o agendamento ${appointmentId} como concluído?`)) {
                    await updateAppointmentStatus(appointmentId, 'concluido');
                    fetchAgendaAppointments(); // Re-render list
                } else if (currentStatus === 'concluido') {
                    alert('Este agendamento já está marcado como concluído.');
                }
            });
        });

        agendaList.querySelectorAll('.delete-button').forEach(button => {
            button.addEventListener('click', async (event) => {
                const appointmentId = event.target.dataset.id;
                if (confirm(`Tem certeza que deseja excluir o agendamento ${appointmentId}? Isso é irreversível.`)) {
                    await deleteAppointment(appointmentId);
                    fetchAgendaAppointments(); // Re-render list
                }
            });
        });
        
    } catch (error) {
        console.error('Error fetching agenda appointments:', error);
        agendaList.innerHTML = '<p class="empty-state">Erro ao carregar agendamentos.</p>';
    }
}

// Helper function to update appointment status
async function updateAppointmentStatus(id, newStatus) {
    try {
        const response = await fetch(`http://localhost:3001/api/agendamentos/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'Failed to update appointment status');
        }
        alert('Status do agendamento atualizado com sucesso!');
    } catch (error) {
        console.error('Error updating appointment status:', error);
        alert('Erro ao atualizar status do agendamento: ' + error.message);
    }
}

// Helper function to delete appointment
async function deleteAppointment(id) {
    try {
        const response = await fetch(`http://localhost:3001/api/agendamentos/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'Failed to delete appointment');
        }
        alert('Agendamento excluído com sucesso!');
    } catch (error) {
        console.error('Error deleting appointment:', error);
        alert('Erro ao excluir agendamento: ' + error.message);
    }
}