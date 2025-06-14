// public/js/main.js

document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.section-content');

    // Função para mostrar a seção ativa e ocultar as outras
    const showSection = (sectionId) => {
        sections.forEach(section => {
            section.classList.remove('active');
            if (section.id === `${sectionId}-content`) {
                section.classList.add('active');
            }
        });

        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.section === sectionId) {
                item.classList.add('active');
            }
        });

        // Trigger a custom event for the newly active section to load its data
        const activeSectionElement = document.getElementById(`${sectionId}-content`);
        if (activeSectionElement) {
            const event = new Event('sectionActivated');
            activeSectionElement.dispatchEvent(event);
        }
    };

    // Lidar com a navegação da sidebar
    navItems.forEach(item => {
        item.addEventListener('click', (event) => {
            event.preventDefault();
            const sectionId = item.dataset.section;
            showSection(sectionId);

            // Atualizar a URL sem recarregar a página
            history.pushState(null, '', `#${sectionId}`);
        });
    });

    // Lidar com a navegação ao usar o botão "Voltar" do navegador
    window.addEventListener('popstate', () => {
        const hash = window.location.hash.substring(1); // Remover o '#'
        if (hash) {
            showSection(hash);
        } else {
            showSection('dashboard'); // Se não houver hash, vai para o dashboard
        }
    });

    // Carregar a seção inicial com base no hash da URL ou padronizar para 'dashboard'
    const initialHash = window.location.hash.substring(1);
    if (initialHash) {
        showSection(initialHash);
    } else {
        showSection('dashboard');
    }
});