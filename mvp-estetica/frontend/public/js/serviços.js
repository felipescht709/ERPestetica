// public/js/servicos.js

document.addEventListener('DOMContentLoaded', () => {
    const servicesContent = document.getElementById('servicos-content');
    if (servicesContent) {
        servicesContent.addEventListener('sectionActivated', fetchServices);
        if (servicesContent.classList.contains('active')) {
            fetchServices();
        }
    }
});

function getServiceCategoryColorClass(category) {
    const colors = {
        'Lavagem': 'bg-blue-100 text-blue-800',
        'Proteção': 'bg-green-100 text-green-800',
        'Premium': 'bg-purple-100 text-purple-800',
        'Especial': 'bg-orange-100 text-orange-800',
        'Complemento': 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
}

async function fetchServices() {
    const serviceStatsContainer = document.getElementById('service-stats');
    const servicesByCategoryContainer = document.getElementById('services-by-category');

    try {
        const response = await fetch('http://localhost:3001/api/servicos');
        const services = await response.json();

        const categories = [...new Set(services.map(service => service.categoria))];

        // Renderizar estatísticas de serviços
        const totalServices = services.length;
        const averagePrice = totalServices > 0 ? services.reduce((sum, service) => sum + parseFloat(service.preco), 0) / totalServices : 0;
        const averageDuration = totalServices > 0 ? services.reduce((sum, service) => sum + service.duracao_minutos, 0) / totalServices : 0;
        const totalCategories = categories.length;

        serviceStatsContainer.innerHTML = `
            <div class="info-card">
                <div class="flex-between-center">
                    <div>
                        <p class="info-card-title">Total de Serviços</p>
                        <p class="info-card-value">${totalServices}</p>
                    </div>
                    <div class="info-card-icon bg-blue-100">🚗</div>
                </div>
            </div>
            <div class="info-card">
                <div class="flex-between-center">
                    <div>
                        <p class="info-card-title">Preço Médio</p>
                        <p class="info-card-value text-green-600">R$ ${averagePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div class="info-card-icon bg-green-100">💰</div>
                </div>
            </div>
            <div class="info-card">
                <div class="flex-between-center">
                    <div>
                        <p class="info-card-title">Tempo Médio</p>
                        <p class="info-card-value text-purple-600">${Math.round(averageDuration)} min</p>
                    </div>
                    <div class="info-card-icon bg-purple-100">⏰</div>
                </div>
            </div>
            <div class="info-card">
                <div class="flex-between-center">
                    <div>
                        <p class="info-card-title">Categorias</p>
                        <p class="info-card-value text-orange-600">${totalCategories}</p>
                    </div>
                    <div class="info-card-icon bg-orange-100">🏷️</div>
                </div>
            </div>
        `;

        // Renderizar serviços por categoria
        servicesByCategoryContainer.innerHTML = categories.map(category => {
            const servicesInCategory = services.filter(service => service.categoria === category);
            return `
                <div class="service-category-section">
                    <div class="service-category-header">
                        <h2 class="service-category-title">${category}</h2>
                        <span class="service-category-badge ${getServiceCategoryColorClass(category)}">
                            ${servicesInCategory.length} serviços
                        </span>
                    </div>
                    <div class="service-category-content">
                        ${servicesInCategory.map(service => `
                            <div class="service-list-item">
                                <div class="service-info">
                                    <div class="service-name-status">
                                        <h3 class="service-name">${service.nome}</h3>
                                        ${service.ativo ? `<span class="service-status-badge">Ativo</span>` : ''}
                                    </div>
                                    <p class="service-description">${service.descricao}</p>
                                    <div class="service-details">
                                        <div class="service-detail-item">
                                            ⏰ <span>${service.duracao_minutos} minutos</span>
                                        </div>
                                        <div class="service-detail-item">
                                            💰 <span class="service-price">R$ ${parseFloat(service.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="service-actions">
                                    <button class="service-action-button edit" data-id="${service.id}">✏️</button>
                                    <button class="service-action-button delete" data-id="${service.id}">🗑️</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners for buttons
        servicesByCategoryContainer.querySelectorAll('.delete-button').forEach(button => {
            button.addEventListener('click', async (event) => {
                const serviceId = event.target.dataset.id;
                if (confirm(`Tem certeza que deseja excluir o serviço ${serviceId}? Isso é irreversível.`)) {
                    await deleteService(serviceId);
                    fetchServices(); // Re-render list
                }
            });
        });

    } catch (error) {
        console.error('Error fetching services data:', error);
        serviceStatsContainer.innerHTML = '<p class="empty-state">Erro ao carregar serviços.</p>';
        servicesByCategoryContainer.innerHTML = '';
    }
}

// Helper function to delete service
async function deleteService(id) {
    try {
        const response = await fetch(`http://localhost:3001/api/servicos/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || 'Failed to delete service');
        }
        alert('Serviço excluído com sucesso!');
    } catch (error) {
        console.error('Error deleting service:', error);
        alert('Erro ao excluir serviço: ' + error.message);
    }
}