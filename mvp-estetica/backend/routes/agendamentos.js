// routes/agendamentos.js
const express = require('express');
const router = express.Router();
const pool = require('../banco');
const { authenticateToken, authorizeRole } = require('../middleware/auth'); // Importa os middlewares

// Helper para combinar data e hora (pode ser movido para um utils.js)
const combineDateTime = (dateStr, timeStr) => {
    return new Date(`${dateStr}T${timeStr}:00`); // Assuming HH:MM format
};

// GET all appointments (with client, service, vehicle and responsible user details)
// Administradores e Gerentes podem ver todos
// Atendentes e Técnicos talvez só os de sua empresa ou os que são responsáveis
router.get('/', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente', 'tecnico']), async (req, res) => {
    try {
        const query = `
            SELECT
                a.cod_agendamento,
                a.data_hora_inicio,
                a.data_hora_fim,
                a.preco_total,
                a.status,
                a.tipo_agendamento,
                a.forma_pagamento,
                a.observacoes_agendamento,
                c.nome_cliente AS cliente_nome,
                c.telefone AS cliente_telefone,
                s.nome_servico AS servico_nome,
                s.descricao_servico AS servico_descricao,
                v.marca AS veiculo_marca,
                v.modelo AS veiculo_modelo,
                v.cor AS veiculo_cor,
                v.placa AS veiculo_placa,
                u.nome_usuario AS usuario_responsavel_nome
            FROM agendamentos a
            JOIN clientes c ON a.cliente_cod = c.cod_cliente
            JOIN servicos s ON a.servico_cod = s.cod_servico
            LEFT JOIN veiculos v ON a.veiculo_cod = v.cod_veiculo
            LEFT JOIN usuarios u ON a.usuario_responsavel_cod = u.cod_usuario
            ORDER BY a.data_hora_inicio, a.data_hora_fim;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET appointments by date range (para o Big Calendar)
// Isso é mais útil para o frontend do calendário
router.get('/range', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente', 'tecnico']), async (req, res) => {
    const { start, end } = req.query; // Espera ISO strings de data/hora
    try {
        if (!start || !end) {
            return res.status(400).json({ msg: 'Datas de início e fim são obrigatórias para a busca por período.' });
        }

        const query = `
            SELECT
                a.cod_agendamento,
                a.data_hora_inicio,
                a.data_hora_fim,
                a.preco_total,
                a.status,
                a.tipo_agendamento,
                a.forma_pagamento,
                a.observacoes_agendamento,
                c.nome_cliente AS cliente_nome,
                c.telefone AS cliente_telefone,
                s.nome_servico AS servico_nome,
                s.descricao_servico AS servico_descricao,
                v.marca AS veiculo_marca,
                v.modelo AS veiculo_modelo,
                v.cor AS veiculo_cor,
                v.placa AS veiculo_placa,
                u.nome_usuario AS usuario_responsavel_nome
            FROM agendamentos a
            JOIN clientes c ON a.cliente_cod = c.cod_cliente
            JOIN servicos s ON a.servico_cod = s.cod_servico
            LEFT JOIN veiculos v ON a.veiculo_cod = v.cod_veiculo
            LEFT JOIN usuarios u ON a.usuario_responsavel_cod = u.cod_usuario
            WHERE a.data_hora_inicio >= $1 AND a.data_hora_inicio <= $2
            ORDER BY a.data_hora_inicio;
        `;
        const result = await pool.query(query, [start, end]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// GET appointment by ID
router.get('/:id', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente', 'tecnico']), async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT
                a.cod_agendamento,
                a.data_hora_inicio,
                a.data_hora_fim,
                a.preco_total,
                a.status,
                a.tipo_agendamento,
                a.forma_pagamento,
                a.observacoes_agendamento,
                c.nome_cliente AS cliente_nome,
                c.telefone AS cliente_telefone,
                s.nome_servico AS servico_nome,
                s.descricao_servico AS servico_descricao,
                v.marca AS veiculo_marca,
                v.modelo AS veiculo_modelo,
                v.cor AS veiculo_cor,
                v.placa AS veiculo_placa,
                u.nome_usuario AS usuario_responsavel_nome
            FROM agendamentos a
            JOIN clientes c ON a.cliente_cod = c.cod_cliente
            JOIN servicos s ON a.servico_cod = s.cod_servico
            LEFT JOIN veiculos v ON a.veiculo_cod = v.cod_veiculo
            LEFT JOIN usuarios u ON a.usuario_responsavel_cod = u.cod_usuario
            WHERE a.cod_agendamento = $1;
        `;
        const appointment = await pool.query(query, [id]);
        if (appointment.rows.length === 0) {
            return res.status(404).json({ msg: 'Agendamento não encontrado' });
        }
        res.json(appointment.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// POST a new appointment
router.post('/', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    const {
        cliente_cod,
        servico_cod,
        veiculo_cod, // Novo campo
        usuario_responsavel_cod, // Novo campo
        data, // Data no formato YYYY-MM-DD
        hora, // Hora no formato HH:MM
        duracao_minutos, // Pode vir do serviço, mas permitindo sobrescrever
        preco_total, // Pode vir do serviço, mas permitindo sobrescrever
        status = 'Pendente', // Default status
        tipo_agendamento, // Novo campo
        forma_pagamento, // Novo campo
        observacoes_agendamento // Novo campo
    } = req.body;

    try {
        // 1. Validação de campos obrigatórios
        if (!cliente_cod || !servico_cod || !data || !hora || !duracao_minutos) {
            return res.status(400).json({ msg: 'Cliente, serviço, data, hora e duração são obrigatórios para o agendamento.' });
        }

        // 2. Obter dados do serviço para preencher duracao_minutos e preco_total se não fornecidos
        let finalDuracaoMinutos = duracao_minutos;
        let finalPrecoTotal = preco_total;

        if (finalDuracaoMinutos === undefined || finalPrecoTotal === undefined) {
            const serviceData = await pool.query('SELECT duracao_minutos, preco FROM servicos WHERE cod_servico = $1', [servico_cod]);
            if (serviceData.rows.length === 0) {
                return res.status(400).json({ msg: 'Serviço não encontrado.' });
            }
            if (finalDuracaoMinutos === undefined) finalDuracaoMinutos = serviceData.rows[0].duracao_minutos;
            if (finalPrecoTotal === undefined) finalPrecoTotal = serviceData.rows[0].preco;
        }

        if (isNaN(finalDuracaoMinutos) || finalDuracaoMinutos <= 0) {
            return res.status(400).json({ msg: 'Duração do agendamento deve ser um número positivo.' });
        }
        if (isNaN(finalPrecoTotal) || finalPrecoTotal < 0) {
            return res.status(400).json({ msg: 'Preço total do agendamento deve ser um número não negativo.' });
        }

        // 3. Calcular data_hora_inicio e data_hora_fim
        const dataHoraInicio = combineDateTime(data, hora);
        const dataHoraFim = new Date(dataHoraInicio.getTime() + finalDuracaoMinutos * 60 * 1000);

        // 4. Verificar conflitos de horário (NOVO)
        const conflictCheck = await pool.query(
            `SELECT cod_agendamento FROM agendamentos
             WHERE (data_hora_inicio < $1 AND data_hora_fim > $2)
                OR (data_hora_inicio >= $1 AND data_hora_inicio < $2)
                OR (data_hora_fim > $1 AND data_hora_fim <= $2)`,
            [dataHoraFim, dataHoraInicio] // Invertido para pegar sobreposição correta
        );

        if (conflictCheck.rows.length > 0) {
            return res.status(409).json({ msg: 'Conflito de horário. Já existe um agendamento neste período.' });
        }

        // 5. Inserir novo agendamento
        const newAppointment = await pool.query(
            `INSERT INTO agendamentos (
                cliente_cod, servico_cod, veiculo_cod, usuario_responsavel_cod,
                data_hora_inicio, data_hora_fim, preco_total, status, tipo_agendamento, forma_pagamento, observacoes_agendamento
            ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [
                cliente_cod, servico_cod, veiculo_cod, usuario_responsavel_cod,
                dataHoraInicio, dataHoraFim, finalPrecoTotal, status, tipo_agendamento, forma_pagamento, observacoes_agendamento
            ]
        );

        // 6. Atualizar ultimo_servico e total_gasto do cliente (se status 'concluido' ou relevante)
        // Isso seria feito com um TRIGGER no banco de dados para melhor consistência
        // Ou em um serviço separado que reage a mudanças de status.
        // Por enquanto, não faremos aqui para manter a responsabilidade da rota única.

        res.status(201).json(newAppointment.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// PUT (update) an appointment
router.put('/:id', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    const { id } = req.params;
    const {
        cliente_cod,
        servico_cod,
        veiculo_cod,
        usuario_responsavel_cod,
        data,
        hora,
        duracao_minutos,
        preco_total,
        status,
        tipo_agendamento,
        forma_pagamento,
        observacoes_agendamento
    } = req.body;

    let query = 'UPDATE agendamentos SET ';
    const params = [];
    let i = 1;

    // Campos que podem ser atualizados
    if (cliente_cod !== undefined) { query += `cliente_cod = $${i++}, `; params.push(cliente_cod); }
    if (servico_cod !== undefined) { query += `servico_cod = $${i++}, `; params.push(servico_cod); }
    if (veiculo_cod !== undefined) { query += `veiculo_cod = $${i++}, `; params.push(veiculo_cod); }
    if (usuario_responsavel_cod !== undefined) { query += `usuario_responsavel_cod = $${i++}, `; params.push(usuario_responsavel_cod); }

    let newPrecoTotal = preco_total;
    let newDuracaoMinutos = duracao_minutos;

    // Se a duração ou preço forem atualizados, ou o serviço mudar, buscar novamente
    if (servico_cod !== undefined || (duracao_minutos === undefined && preco_total === undefined)) {
        const currentService = await pool.query('SELECT duracao_minutos, preco FROM servicos WHERE cod_servico = $1', [servico_cod || req.body.servico_cod]);
        if (currentService.rows.length === 0) {
            return res.status(400).json({ msg: 'Serviço não encontrado para atualização.' });
        }
        if (newDuracaoMinutos === undefined) newDuracaoMinutos = currentService.rows[0].duracao_minutos;
        if (newPrecoTotal === undefined) newPrecoTotal = currentService.rows[0].preco;
    }

    if (newDuracaoMinutos !== undefined) {
        if (isNaN(newDuracaoMinutos) || newDuracaoMinutos <= 0) {
            return res.status(400).json({ msg: 'Duração em minutos deve ser um número positivo.' });
        }
    }
    if (newPrecoTotal !== undefined) {
        if (isNaN(newPrecoTotal) || newPrecoTotal < 0) {
            return res.status(400).json({ msg: 'Preço total do agendamento deve ser um número não negativo.' });
        }
    }

    // Recalcular data_hora_inicio e data_hora_fim se data/hora ou duracao_minutos mudarem
    let dataHoraInicio, dataHoraFim;
    if (data !== undefined || hora !== undefined || newDuracaoMinutos !== undefined) {
        // Buscar o agendamento atual para obter a data/hora existente se não fornecida
        const currentAppointment = await pool.query('SELECT data_hora_inicio FROM agendamentos WHERE cod_agendamento = $1', [id]);
        if (currentAppointment.rows.length === 0) {
            return res.status(404).json({ msg: 'Agendamento não encontrado para recalcular data/hora.' });
        }
        const existingDate = new Date(currentAppointment.rows[0].data_hora_inicio);

        const targetData = data || existingDate.toISOString().split('T')[0];
        const targetHora = hora || existingDate.toTimeString().slice(0, 5); // HH:MM

        dataHoraInicio = combineDateTime(targetData, targetHora);
        dataHoraFim = new Date(dataHoraInicio.getTime() + newDuracaoMinutos * 60 * 1000);

        query += `data_hora_inicio = $${i++}, `; params.push(dataHoraInicio);
        query += `data_hora_fim = $${i++}, `; params.push(dataHoraFim);

        // Verificar conflitos de horário para a atualização (excluindo o próprio agendamento)
        const conflictCheck = await pool.query(
            `SELECT cod_agendamento FROM agendamentos
             WHERE cod_agendamento != $1
               AND (data_hora_inicio < $2 AND data_hora_fim > $3)
                OR (data_hora_inicio >= $2 AND data_hora_inicio < $3)
                OR (data_hora_fim > $2 AND data_hora_fim <= $3)`,
            [id, dataHoraFim, dataHoraInicio] // Invertido para pegar sobreposição correta
        );

        if (conflictCheck.rows.length > 0) {
            return res.status(409).json({ msg: 'Conflito de horário. Já existe um agendamento neste período.' });
        }
    }

    if (newPrecoTotal !== undefined) { query += `preco_total = $${i++}, `; params.push(newPrecoTotal); }
    if (status !== undefined) { query += `status = $${i++}, `; params.push(status); }
    if (tipo_agendamento !== undefined) { query += `tipo_agendamento = $${i++}, `; params.push(tipo_agendamento); }
    if (forma_pagamento !== undefined) { query += `forma_pagamento = $${i++}, `; params.push(forma_pagamento); }
    if (observacoes_agendamento !== undefined) { query += `observacoes_agendamento = $${i++}, `; params.push(observacoes_agendamento); }

    query += `updated_at = CURRENT_TIMESTAMP `; // Adiciona atualização do timestamp

    query = query.replace(/,\s*$/, ""); // Remove a última vírgula e espaço
    if (params.length === 0) {
        return res.status(400).json({ msg: 'Nenhum campo para atualizar fornecido.' });
    }
    query += ` WHERE cod_agendamento = $${i++} RETURNING *`;
    params.push(id);

    try {
        const updatedAppointment = await pool.query(query, params);
        if (updatedAppointment.rows.length === 0) {
            return res.status(404).json({ msg: 'Agendamento não encontrado' });
        }
        res.json(updatedAppointment.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// DELETE an appointment
router.delete('/:id', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    try {
        const { id } = req.params;
        // Considerar marcar como 'cancelado' ao invés de deletar para manter histórico
        const deletedAppointment = await pool.query('UPDATE agendamentos SET status = \'Cancelado\', updated_at = CURRENT_TIMESTAMP WHERE cod_agendamento = $1 RETURNING *', [id]);
        if (deletedAppointment.rows.length === 0) {
            return res.status(404).json({ msg: 'Agendamento não encontrado' });
        }
        res.json({ msg: 'Agendamento cancelado com sucesso (não deletado fisicamente)' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;