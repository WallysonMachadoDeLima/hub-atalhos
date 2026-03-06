
// Hub de Atalhos - Aplicação Principal
class HubAtalhos {
    constructor() {
        this.data = this.loadData();
        this.iframes = new Map(); // Cache de iframes
        this.currentLinkId = null;
        this.init();
        
        // Configuração do Proxy
        this.PROXY_URL = 'http://5.189.139.117/proxy?url=';
        
        // Lista de sites conhecidos por bloquearem iframe
        this.BLOCKED_SITES = [
            'instagram.com',
            'facebook.com',
            'fb.com',
            'twitter.com',
            'x.com',
            'tiktok.com',
            'netflix.com',
            'primevideo.com',
            'disneyplus.com',
            'hbomax.com',
            'spotify.com',
            'youtube.com',
            'youtu.be',
            'google.com',
            'linkedin.com'
        ];
    }

    init() {
        this.popups = {}; // Guarda referências dos popups
        this.renderSidebar();
        this.setupEventListeners();
        this.restoreLastSelected();
        
        // Expõe funções globais para os botões do popup
        window.focusPopup = (linkId) => this.focusPopup(linkId);
        window.closePopup = (linkId) => this.closePopup(linkId);
    }

    // Verifica se URL precisa de proxy
    needsProxy(url) {
        try {
            const hostname = new URL(url).hostname.toLowerCase();
            // SEMPRE usar proxy para esses sites
            const needsIt = this.BLOCKED_SITES.some(site => hostname.includes(site));
            if (needsIt) {
                console.log(`🔒 Site bloqueado detectado: ${hostname}`);
            }
            return needsIt;
        } catch {
            return false;
        }
    }

    // Gera URL do proxy
    getProxiedUrl(url) {
        if (this.needsProxy(url)) {
            console.log(`🔓 Usando proxy para: ${url}`);
            // Adiciona timestamp para evitar cache
            const cacheBuster = `&_t=${Date.now()}`;
            return this.PROXY_URL + encodeURIComponent(url) + cacheBuster;
        }
        return url;
    }

    // Storage
    loadData() {
        const defaultData = {
            groups: [
                { id: 'g1', name: 'EXIBIÇÕES', order: 1 },
                { id: 'g2', name: 'MERCADORIAS', order: 2 }
            ],
            links: [
                { id: 'l1', groupId: 'g1', name: 'Prime Video', url: 'https://www.primevideo.com', order: 1 },
                { id: 'l2', groupId: 'g1', name: 'Netflix', url: 'https://www.netflix.com', order: 2 },
                { id: 'l3', groupId: 'g2', name: 'Amazon', url: 'https://www.amazon.com.br', order: 1 },
                { id: 'l4', groupId: 'g2', name: 'Mercado Livre', url: 'https://www.mercadolivre.com.br', order: 2 }
            ],
            ui: { selectedLinkId: null }
        };

        try {
            const saved = localStorage.getItem('links_hub_data');
            return saved ? JSON.parse(saved) : defaultData;
        } catch {
            return defaultData;
        }
    }

    saveData() {
        localStorage.setItem('links_hub_data', JSON.stringify(this.data));
    }

    // ID Generation
    generateId(prefix) {
        return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).substr(2, 5)}`;
    }

    // Favicon Utils
    getFavicon(url) {
        try {
            const domain = new URL(url).hostname;
            // Usar serviço do Google como fallback
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        } catch {
            return null;
        }
    }

    // Render Sidebar
    renderSidebar() {
        const container = document.getElementById('sidebar-content');
        container.innerHTML = '';

        // Ordena grupos
        const groups = [...this.data.groups].sort((a, b) => a.order - b.order);

        groups.forEach(group => {
            const groupEl = document.createElement('div');
            groupEl.className = 'group';

            // Header do grupo
            const headerEl = document.createElement('div');
            headerEl.className = 'group-header';
            headerEl.innerHTML = `
                <div class="group-title">
                    <i class="fas fa-folder"></i>
                    <span>${group.name}</span>
                </div>
                <div class="group-actions">
                    <button data-action="add-link" data-group="${group.id}" title="Adicionar Link">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button data-action="edit-group" data-group="${group.id}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button data-action="delete-group" data-group="${group.id}" title="Remover">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            // Container de links
            const linksContainer = document.createElement('div');
            linksContainer.className = 'group-links';

            // Filtra e ordena links do grupo
            const links = this.data.links
                .filter(l => l.groupId === group.id)
                .sort((a, b) => a.order - b.order);

            links.forEach(link => {
                const linkEl = this.createLinkElement(link);
                linksContainer.appendChild(linkEl);
            });

            groupEl.appendChild(headerEl);
            groupEl.appendChild(linksContainer);
            container.appendChild(groupEl);
        });
    }

    createLinkElement(link) {
        const el = document.createElement('div');
        el.className = 'link-item';
        el.dataset.linkId = link.id;
        if (link.id === this.currentLinkId) {
            el.classList.add('active');
        }

        const faviconUrl = this.getFavicon(link.url);
        const domain = new URL(link.url).hostname;
        const needsPopup = this.needsPopup(link.url);
        const popupIcon = needsPopup ? '<i class="fas fa-external-link-alt" style="color: #f78166; font-size: 10px; margin-left: 5px;"></i>' : '';

        el.innerHTML = `
            <img src="${faviconUrl}" class="link-icon" alt="" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22%3E%3Ctext y=%2215%22 font-size=%2215%22%3E🔗%3C/text%3E%3C/svg%3E'">
            <div class="link-info">
                <div class="link-name">${link.name}${popupIcon}</div>
                <div class="link-url">${domain}</div>
            </div>
        `;

        el.addEventListener('click', () => this.selectLink(link.id));
        return el;
    }

    // Iframe Management (Cache)
    selectLink(linkId) {
        const link = this.data.links.find(l => l.id === linkId);
        if (!link) return;

        const originalUrl = link.url;
        
        // SE FOR SITE BLOQUEADO, ABRE POPUP IMEDIATAMENTE (sem tentar iframe)
        if (this.needsPopup(originalUrl)) {
            console.log('🚫 Site bloqueado detectado, abrindo popup:', originalUrl);
            this.currentLinkId = linkId;
            this.data.ui.selectedLinkId = linkId;
            this.saveData();
            
            // Atualiza UI
            document.querySelectorAll('.link-item').forEach(el => {
                el.classList.toggle('active', el.dataset.linkId === linkId);
            });
            
            const group = this.data.groups.find(g => g.id === link.groupId);
            document.getElementById('breadcrumb').innerHTML = `
                <span class="group-name">${group.name}</span>
                <span class="separator">/</span>
                <span class="link-name">${link.name} <span style="color: #f78166; font-size: 10px;">[POPUP]</span></span>
            `;
            
            document.getElementById('btn-edit-link').disabled = false;
            document.getElementById('btn-delete-link').disabled = false;
            
            // ABRE POPUP DIRETO
            this.openPopupWindow(originalUrl, linkId);
            return;
        }
        
        // Se não for bloqueado, usa iframe normalmente
        this.showIframe(linkId, originalUrl, originalUrl);
    }
    
    // Lista de sites que PRECISAM de popup (não funcionam em iframe nunca)
    needsPopup(url) {
        const blockedDomains = [
            'instagram.com',
            'facebook.com', 
            'fb.com',
            'twitter.com',
            'x.com',
            'tiktok.com',
            'netflix.com',
            'primevideo.com',
            'disneyplus.com',
            'hbomax.com',
            'spotify.com',
            'youtube.com',
            'youtu.be',
            'google.com',
            'gmail.com',
            'linkedin.com',
            'whatsapp.com',
            'web.whatsapp.com'
        ];
        
        try {
            const hostname = new URL(url).hostname.toLowerCase();
            return blockedDomains.some(domain => hostname.includes(domain));
        } catch {
            return false;
        }
    }

    showIframe(linkId, url, originalUrl = null) {
        const container = document.getElementById('iframe-container');

        // Esconde todos os iframes
        this.iframes.forEach((iframe, id) => {
            iframe.classList.add('hidden');
        });

        // Remove empty state se existir
        const emptyState = container.querySelector('.empty-state');
        if (emptyState) emptyState.remove();

        // Verifica se já tem iframe para este link
        let iframe = this.iframes.get(linkId);

        if (!iframe) {
            // Mostra loading
            this.showLoading();
            
            // Cria novo iframe
            iframe = document.createElement('iframe');
            iframe.src = url;
            iframe.dataset.linkId = linkId;
            iframe.dataset.originalUrl = originalUrl || url;
            
            // PERMISSÕES MÁXIMAS para permitir qualquer site
            iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-top-navigation');
            iframe.setAttribute('allow', 'accelerometer; autoplay; camera; clipboard-write; encrypted-media; fullscreen; geolocation; gyroscope; microphone; midi; payment; picture-in-picture; usb; web-share; xr-spatial-tracking');
            iframe.setAttribute('allowfullscreen', 'true');
            iframe.setAttribute('loading', 'eager');
            
            // Handler para sites que bloqueiam iframe
            let loadTimeout = setTimeout(() => {
                // Se demorar muito, assume que está funcionando
                this.hideLoading();
            }, 5000);
            
            iframe.addEventListener('load', () => {
                clearTimeout(loadTimeout);
                this.hideLoading();
                
                try {
                    // Tenta acessar contentDocument
                    const doc = iframe.contentDocument || iframe.contentWindow?.document;
                    if (!doc || doc.body?.innerHTML === '' || doc.body?.innerHTML?.includes(' refused to connect')) {
                        // Se estiver vazio ou mostrar erro de conexão, tenta proxy
                        if (!this.needsProxy(originalUrl || url)) {
                            console.log('⚠️ Site bloqueou, tentando proxy...');
                            const proxyUrl = this.PROXY_URL + encodeURIComponent(originalUrl || url);
                            iframe.src = proxyUrl;
                        }
                    }
                } catch (e) {
                    // Cross-origin é normal quando funciona
                    console.log('✅ Iframe carregado (cross-origin)');
                }
            });

            iframe.addEventListener('error', () => {
                clearTimeout(loadTimeout);
                this.hideLoading();
                // Se erro e não está usando proxy, tenta com proxy
                if (!this.needsProxy(originalUrl || url)) {
                    console.log('⚠️ Erro no iframe, tentando proxy...');
                    const proxyUrl = this.PROXY_URL + encodeURIComponent(originalUrl || url);
                    iframe.src = proxyUrl;
                } else {
                    this.showBlockedFallback(linkId, originalUrl || url);
                }
            });

            container.appendChild(iframe);
            this.iframes.set(linkId, iframe);
        }

        // Mostra o iframe atual
        iframe.classList.remove('hidden');
    }

    showLoading() {
        // Remove loading anterior se existir
        const existing = document.querySelector('.iframe-loading');
        if (existing) existing.remove();
        
        const container = document.getElementById('iframe-container');
        const loading = document.createElement('div');
        loading.className = 'iframe-loading';
        loading.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-circle-notch fa-spin"></i>
                <span>Carregando site...</span>
            </div>
        `;
        container.appendChild(loading);
    }

    hideLoading() {
        const loading = document.querySelector('.iframe-loading');
        if (loading) loading.remove();
    }

    showBlockedFallback(linkId, url) {
        const container = document.getElementById('iframe-container');
        
        // Esconde o iframe com erro
        const iframe = this.iframes.get(linkId);
        if (iframe) iframe.classList.add('hidden');

        // Abre popup ao invés de mostrar fallback estático
        this.openPopupWindow(url, linkId);
    }
    
    openPopupWindow(url, linkId) {
        const width = Math.min(1200, screen.width * 0.9);
        const height = Math.min(800, screen.height * 0.9);
        const left = (screen.width - width) / 2;
        const top = (screen.height - height) / 2;
        
        const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes,location=yes,menubar=yes,toolbar=yes`;
        
        console.log('🪟 Abrindo popup:', url);
        const popup = window.open(url, `popup_${linkId}`, features);
        
        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
            // Popup bloqueado, mostra mensagem
            this.showPopupBlockedMessage(url);
        } else {
            // Popup aberto com sucesso
            this.showPopupActiveMessage(linkId, popup);
        }
    }
    
    showPopupActiveMessage(linkId, popup) {
        const container = document.getElementById('iframe-container');
        container.innerHTML = `
            <div class="popup-active-message">
                <i class="fas fa-window-restore"></i>
                <h3>Site aberto em janela popup</h3>
                <p>O site está aberto em uma janela separada.</p>
                <div class="popup-actions">
                    <button class="btn-primary" onclick="window.focusPopup('${linkId}')">
                        <i class="fas fa-bring-front"></i> Trazer para frente
                    </button>
                    <button class="btn-secondary" onclick="window.closePopup('${linkId}')">
                        <i class="fas fa-times"></i> Fechar janela
                    </button>
                </div>
                <p class="hint">Você pode continuar usando o Hub normalmente.</p>
            </div>
        `;
        
        // Guarda referência do popup
        this.popups = this.popups || {};
        this.popups[linkId] = popup;
    }
    
    showPopupBlockedMessage(url) {
        const container = document.getElementById('iframe-container');
        container.innerHTML = `
            <div class="popup-blocked-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Popup bloqueado pelo navegador</h3>
                <p>Seu navegador bloqueou a janela popup. Clique abaixo para abrir:</p>
                <a href="${url}" target="_blank" class="btn-primary">
                    <i class="fas fa-external-link-alt"></i> Abrir em nova aba
                </a>
                <p class="hint">💡 Dica: Permita popups para este site nas configurações do navegador</p>
            </div>
        `;
    }
    
    focusPopup(linkId) {
        if (this.popups && this.popups[linkId]) {
            this.popups[linkId].focus();
        }
    }
    
    closePopup(linkId) {
        if (this.popups && this.popups[linkId]) {
            this.popups[linkId].close();
            delete this.popups[linkId];
            this.showIframe(this.currentLinkId, this.data.links.find(l => l.id === this.currentLinkId)?.url);
        }
    }

    // CRUD Groups
    openGroupModal(groupId = null) {
        const modal = document.getElementById('modal-group');
        const title = document.getElementById('modal-group-title');
        const idInput = document.getElementById('group-id');
        const nameInput = document.getElementById('group-name');

        if (groupId) {
            const group = this.data.groups.find(g => g.id === groupId);
            title.textContent = 'Editar Grupo';
            idInput.value = group.id;
            nameInput.value = group.name;
        } else {
            title.textContent = 'Novo Grupo';
            idInput.value = '';
            nameInput.value = '';
        }

        modal.classList.add('active');
        nameInput.focus();
    }

    saveGroup() {
        const id = document.getElementById('group-id').value;
        const name = document.getElementById('group-name').value.trim();

        if (!name) {
            alert('Digite um nome para o grupo');
            return;
        }

        if (id) {
            // Edit
            const group = this.data.groups.find(g => g.id === id);
            group.name = name;
        } else {
            // Create
            const maxOrder = Math.max(...this.data.groups.map(g => g.order), 0);
            this.data.groups.push({
                id: this.generateId('g'),
                name,
                order: maxOrder + 1
            });
        }

        this.saveData();
        this.renderSidebar();
        this.closeModal('modal-group');
    }

    deleteGroup(groupId) {
        if (!confirm('Remover este grupo e todos os seus links?')) return;

        this.data.groups = this.data.groups.filter(g => g.id !== groupId);
        this.data.links = this.data.links.filter(l => l.groupId !== groupId);

        // Remove iframes dos links deletados
        this.data.links.forEach(l => {
            if (this.iframes.has(l.id)) {
                this.iframes.get(l.id).remove();
                this.iframes.delete(l.id);
            }
        });

        this.saveData();
        this.renderSidebar();
    }

    // CRUD Links
    openLinkModal(linkId = null) {
        const modal = document.getElementById('modal-link');
        const title = document.getElementById('modal-link-title');
        const idInput = document.getElementById('link-id');
        const groupSelect = document.getElementById('link-group');
        const nameInput = document.getElementById('link-name');
        const urlInput = document.getElementById('link-url');

        // Popula grupos
        groupSelect.innerHTML = this.data.groups
            .sort((a, b) => a.order - b.order)
            .map(g => `<option value="${g.id}">${g.name}</option>`)
            .join('');

        if (linkId) {
            const link = this.data.links.find(l => l.id === linkId);
            title.textContent = 'Editar Link';
            idInput.value = link.id;
            groupSelect.value = link.groupId;
            nameInput.value = link.name;
            urlInput.value = link.url;
        } else {
            title.textContent = 'Novo Link';
            idInput.value = '';
            nameInput.value = '';
            urlInput.value = '';
            // Seleciona primeiro grupo por padrão
            if (this.data.groups.length > 0) {
                groupSelect.value = this.data.groups[0].id;
            }
        }

        modal.classList.add('active');
        nameInput.focus();
    }

    saveLink() {
        const id = document.getElementById('link-id').value;
        const groupId = document.getElementById('link-group').value;
        const name = document.getElementById('link-name').value.trim();
        let url = document.getElementById('link-url').value.trim();

        if (!name || !url) {
            alert('Preencha todos os campos');
            return;
        }

        // Adiciona https:// se não tiver protocolo
        if (!url.match(/^https?:\/\//)) {
            url = 'https://' + url;
        }

        try {
            new URL(url); // Valida URL
        } catch {
            alert('URL inválida');
            return;
        }

        if (id) {
            // Edit
            const link = this.data.links.find(l => l.id === id);
            const oldUrl = link.url;
            
            link.groupId = groupId;
            link.name = name;
            link.url = url;

            // Se URL mudou, remove iframe antigo para recriar
            if (oldUrl !== url && this.iframes.has(id)) {
                this.iframes.get(id).remove();
                this.iframes.delete(id);
            }
        } else {
            // Create
            const linksInGroup = this.data.links.filter(l => l.groupId === groupId);
            const maxOrder = Math.max(...linksInGroup.map(l => l.order), 0);
            
            this.data.links.push({
                id: this.generateId('l'),
                groupId,
                name,
                url,
                order: maxOrder + 1
            });
        }

        this.saveData();
        this.renderSidebar();
        this.closeModal('modal-link');

        // Se editou o link atual, atualiza
        if (id === this.currentLinkId) {
            this.selectLink(id);
        }
    }

    deleteLink(linkId) {
        if (!confirm('Remover este link?')) return;

        this.data.links = this.data.links.filter(l => l.id !== linkId);

        // Remove iframe
        if (this.iframes.has(linkId)) {
            this.iframes.get(linkId).remove();
            this.iframes.delete(linkId);
        }

        // Se era o link atual, limpa
        if (this.currentLinkId === linkId) {
            this.currentLinkId = null;
            document.getElementById('iframe-container').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-mouse-pointer"></i>
                    <p>Selecione um link no menu lateral</p>
                </div>
            `;
            document.getElementById('breadcrumb').innerHTML = '<span>Selecione um link</span>';
            document.getElementById('btn-edit-link').disabled = true;
            document.getElementById('btn-delete-link').disabled = true;
        }

        this.saveData();
        this.renderSidebar();
    }

    // Modal Utils
    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    // Restore
    restoreLastSelected() {
        if (this.data.ui.selectedLinkId) {
            const link = this.data.links.find(l => l.id === this.data.ui.selectedLinkId);
            if (link) {
                this.selectLink(link.id);
            }
        }
    }

    // Event Listeners
    setupEventListeners() {
        // Add Group
        document.getElementById('btn-add-group').addEventListener('click', () => {
            this.openGroupModal();
        });

        // Save Group
        document.getElementById('btn-save-group').addEventListener('click', () => {
            this.saveGroup();
        });

        // Edit/Delete Link
        document.getElementById('btn-edit-link').addEventListener('click', () => {
            if (this.currentLinkId) this.openLinkModal(this.currentLinkId);
        });

        document.getElementById('btn-delete-link').addEventListener('click', () => {
            if (this.currentLinkId) this.deleteLink(this.currentLinkId);
        });

        // Save Link
        document.getElementById('btn-save-link').addEventListener('click', () => {
            this.saveLink();
        });

        // Close Modals
        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.closeModal(e.target.dataset.close);
            });
        });

        // Close modal on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });

        // Group actions (delegation)
        document.getElementById('sidebar-content').addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;

            const action = btn.dataset.action;
            const groupId = btn.dataset.group;

            switch (action) {
                case 'add-link':
                    document.getElementById('link-group').value = groupId;
                    this.openLinkModal();
                    break;
                case 'edit-group':
                    this.openGroupModal(groupId);
                    break;
                case 'delete-group':
                    this.deleteGroup(groupId);
                    break;
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.active').forEach(m => {
                    m.classList.remove('active');
                });
            }
        });
    }
}

// Inicializa
const app = new HubAtalhos();
