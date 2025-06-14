// public/js/clientes.js

document.addEventListener('DOMContentLoaded', () => {
    const clientsContent = document.getElementById('clientes-content');
    if (clientsContent) {
        const searchInput = document.getElementById('client-search');
        searchInput.addEventListener('input', fetchClients);
        
        clientsContent.addEventListener('sectionActivated', fetchClients);
        if (clientsContent.classList.contains('active')) {
            fetchClients();
        }
    }
});

function getClientStatusColorClass(status) {
    return status === 'ativo' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
}

async function fetchClients() {
    const searchInput = document.getElementById('client-search');
    const searchTerm = searchInput.value.toLowerCase();
    const clientListContainer = document.getElementById('client-list');
    const clientStatsContainer = document.getElementById('client-stats');

    try {
        const response = await fetch('http://localhost:3001/api/clientes');
        const allClients = await response.json();

        const filteredClients = allClients.filter(client =>
            client.nome.toLowerCase().includes(searchTerm) ||
            client.email.toLowerCase().includes(searchTerm) ||
            client.telefone.includes(searchTerm)
        );

        // Renderizar estatísticas de clientes
        const totalClients = allClients.length;
        const activeClients = allClients.filter(c => c.status === 'ativo').length;
        const totalSpent = allClients.reduce((sum, c) => sum + parseFloat(c.total_gasto || 0), 0); // Handle null/undefined total_gasto
        const averageTicket = totalClients > 0 ? totalSpent / totalClients : 0;

        clientStatsContainer.innerHTML = `
            <div class="info-card">
                <div class="flex-between-center">
                    <div>
                        <p class="info-card-title">Total de Clientes</p>
                        <p class="info-card-value">${totalClients}</p>
                    </div>
                    <div class="info-card-icon bg-blue-100">👤</div>
                </div>
            </div>
            <div class="info-card">
                <div class="flex-between-center">
                    <div>
                        <p class="info-card-title">Clientes Ativos</p>
                        <p class="info-card-value text-green-600">${activeClients}</p>
                    </div>
                    <div class="info-card-icon bg-green-100">👥</div>
                </div>
            </div>
            <div class="info-card">
                <div class="flex-between-center">
                    <div>
                        <p class="info-card-title">Faturamento Total</p>
                        <p class="info-card-value text-purple-600">R$ ${totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div class="info-card-icon bg-purple-100">🚗</div>
                </div>
            </div>
            <div class="info-card">
                <div class="flex-between-center">
                    <div>
                        <p class="info-card-title">Ticket Médito</p>
                        <p class="info-card-value text-orange-600">R$ ${averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div class="info-card-icon bg-orange-100">📅</div>
                </div>
            </div>
        `;

        // Renderizar lista de clientes
        if (filteredClients.length === 0) {
            clientListContainer.innerHTML = '<p class="empty-state">Nenhum cliente encontrado.</p>';
            return;
        }

        clientListContainer.innerHTML = filteredClients.map(client => `
            <div class="card list-item">
                <div class="flex-between-center" style="align-items: flex-start;">
                    <div class="flex-1">
                        <div class="flex items-center space-x-3 mb-3">
                            <div class="logo-circle" style="width: 40px; height: 40px; background-color: var(--blue-status); color: var(--blue-text); border-radius: 9999px;">👤</div>
                            <div>
                                <h3 class="text-lg font-semibold text-gray-900">${client.nome}</h3>
                                <span class="status-badge ${getClientStatusColorClass(client.status)}">
                                    ${client.status === 'ativo' ? 'Ativo' : 'Inativo'}
                                </span>
                            </div>
                        </div>
                        
                        <div class="client-detail-grid">
                            <div>
                                <span>📧 ${client.email}</span>
                            </div>
                            <div>
                                <span>📞 ${client.telefone}</span>
                            </div>
                            <div>
                                <span>📅 Último serviço: ${client.ultimo_servico ? new Date(client.ultimo_servico).toLocaleDateString('pt-BR') : 'N/A'}</span>
                            </div>
                        </div>
                        
                        <div class="client-vehicles">
                            <p class="text-sm text-gray-600" style="margin-bottom: 8px; width: 100%;">Veículos:</p>
                            <span class="client-vehicle-tag">Veículo de Exemplo</span> 
                        </div>
                        
                        <div class="flex-between-center client-actions" style="justify-content: flex-end;">
                            <div class="text-sm text-gray-600">
                                <span class="font-medium text-gray-900">Total gasto: R$ ${parseFloat(client.total_gasto).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div class="flex space-x-2">
                                <button class="button-primary edit-button" data-id="${client.id}">Editar</button>
                                <button class="button-primary schedule-button" data-id="${client.id}">Agendar</button>
                                <button class="button-primary history-button" data-id="${client.id}">Histórico</button>
                                <button class="button-primary delete-button" data-id="${client.id}">Excluir</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Add event listeners for buttons
        clientListContainer.querySelectorAll('.delete-button').forEach(button => {
            button.addEventListener('click', async (event) => {
                const clientId = event.target.dataset.id;
                if (confirm(`Tem certeza que deseja excluir o cliente ${clientId}? Isso é irreversível.`)) {
                    await deleteClient(clientId);
                    fetchClients(); // Re-render list
                }
            });
        });

    } catch (error) {
        console.error('Error fetching clients data:', error);
        clientListContainer.innerHTML = '<p class="empty-state">Erro ao carregar clientes.</p>';
        clientStatsContainer.innerHTML = '';
    }
}

// Helper function to delete client
async function deleteClient(id) {
    try {
        const response = await fetch(`http://localhost:3001/api/clientes/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'Failed to delete client');
        }
        alert('Cliente excluído com sucesso!');
    } catch (error) {
        console.error('Error deleting client:', error);
        alert('Erro ao excluir cliente: ' + error.message);
    }
}