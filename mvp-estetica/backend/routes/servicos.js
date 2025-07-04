// routes/servicos.js
const express = require('express');
const router = express.Router();
const pool = require('../banco');
const { authenticateToken, authorizeRole } = require('../middleware/auth'); // Importa os middlewares

// GET all services
router.get('/', async (req, res) => { // Acesso público, ou para qualquer usuário autenticado
    try {
        const result = await pool.query(
            `SELECT
                cod_servico, nome_servico, descricao_servico, duracao_minutos, preco, categoria, ativo,
                custo_material, custo_mao_de_obra, garantia_dias, observacoes_internas, imagem_url, ordem_exibicao, requer_aprovacao,
                created_at, updated_at
            FROM servicos ORDER BY nome_servico`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET service by ID
router.get('/:id', async (req, res) => { // Acesso público, ou para qualquer usuário autenticado
    try {
        const { id } = req.params;
        const service = await pool.query(
            `SELECT
                cod_servico, nome_servico, descricao_servico, duracao_minutos, preco, categoria, ativo,
                custo_material, custo_mao_de_obra, garantia_dias, observacoes_internas, imagem_url, ordem_exibicao, requer_aprovacao,
                created_at, updated_at
            FROM servicos WHERE cod_servico = $1`,
            [id]
        );
        if (service.rows.length === 0) {
            return res.status(404).json({ msg: 'Serviço não encontrado' });
        }
        res.json(service.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// POST a new service
router.post('/', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    const {
        nome_servico,
        descricao_servico,
        duracao_minutos,
        preco,
        categoria,
        ativo = true,
        custo_material = 0,
        custo_mao_de_obra = 0,
        garantia_dias,
        observacoes_internas,
        imagem_url,
        ordem_exibicao,
        requer_aprovacao = false
    } = req.body;

    try {
        // 1. Validação básica de entrada
        if (!nome_servico || !duracao_minutos || !preco || !categoria) {
            return res.status(400).json({ msg: 'Nome, duração, preço e categoria são obrigatórios.' });
        }
        if (isNaN(duracao_minutos) || duracao_minutos <= 0) {
            return res.status(400).json({ msg: 'Duração em minutos deve ser um número positivo.' });
        }
        if (isNaN(preco) || preco < 0) {
            return res.status(400).json({ msg: 'Preço deve ser um número não negativo.' });
        }
        if (isNaN(custo_material) || custo_material < 0) {
            return res.status(400).json({ msg: 'Custo de material deve ser um número não negativo.' });
        }
        if (isNaN(custo_mao_de_obra) || custo_mao_de_obra < 0) {
            return res.status(400).json({ msg: 'Custo de mão de obra deve ser um número não negativo.' });
        }

        const newService = await pool.query(
            `INSERT INTO servicos (
                nome_servico, descricao_servico, duracao_minutos, preco, categoria, ativo,
                custo_material, custo_mao_de_obra, garantia_dias, observacoes_internas, imagem_url, ordem_exibicao, requer_aprovacao
            ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
            [
                nome_servico, descricao_servico, duracao_minutos, preco, categoria, ativo,
                custo_material, custo_mao_de_obra, garantia_dias, observacoes_internas, imagem_url, ordem_exibicao, requer_aprovacao
            ]
        );
        res.status(201).json(newService.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// PUT (update) a service
router.put('/:id', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    const { id } = req.params;
    const {
        nome_servico,
        descricao_servico,
        duracao_minutos,
        preco,
        categoria,
        ativo,
        custo_material,
        custo_mao_de_obra,
        garantia_dias,
        observacoes_internas,
        imagem_url,
        ordem_exibicao,
        requer_aprovacao
    } = req.body;

    let query = 'UPDATE servicos SET ';
    const params = [];
    let i = 1;

    if (nome_servico !== undefined) { query += `nome_servico = $${i++}, `; params.push(nome_servico); }
    if (descricao_servico !== undefined) { query += `descricao_servico = $${i++}, `; params.push(descricao_servico); }
    if (duracao_minutos !== undefined) {
        if (isNaN(duracao_minutos) || duracao_minutos <= 0) {
            return res.status(400).json({ msg: 'Duração em minutos deve ser um número positivo.' });
        }
        query += `duracao_minutos = $${i++}, `; params.push(duracao_minutos);
    }
    if (preco !== undefined) {
        if (isNaN(preco) || preco < 0) {
            return res.status(400).json({ msg: 'Preço deve ser um número não negativo.' });
        }
        query += `preco = $${i++}, `; params.push(preco);
    }
    if (categoria !== undefined) { query += `categoria = $${i++}, `; params.push(categoria); }
    if (ativo !== undefined) { query += `ativo = $${i++}, `; params.push(ativo); }
    if (custo_material !== undefined) {
        if (isNaN(custo_material) || custo_material < 0) {
            return res.status(400).json({ msg: 'Custo de material deve ser um número não negativo.' });
        }
        query += `custo_material = $${i++}, `; params.push(custo_material);
    }
    if (custo_mao_de_obra !== undefined) {
        if (isNaN(custo_mao_de_obra) || custo_mao_de_obra < 0) {
            return res.status(400).json({ msg: 'Custo de mão de obra deve ser um número não negativo.' });
        }
        query += `custo_mao_de_obra = $${i++}, `; params.push(custo_mao_de_obra);
    }
    if (garantia_dias !== undefined) { query += `garantia_dias = $${i++}, `; params.push(garantia_dias); }
    if (observacoes_internas !== undefined) { query += `observacoes_internas = $${i++}, `; params.push(observacoes_internas); }
    if (imagem_url !== undefined) { query += `imagem_url = $${i++}, `; params.push(imagem_url); }
    if (ordem_exibicao !== undefined) { query += `ordem_exibicao = $${i++}, `; params.push(ordem_exibicao); }
    if (requer_aprovacao !== undefined) { query += `requer_aprovacao = $${i++}, `; params.push(requer_aprovacao); }

    query += `updated_at = CURRENT_TIMESTAMP `;

    query = query.replace(/,\s*$/, ""); // Remove a última vírgula e espaço
    if (params.length === 0) {
        return res.status(400).json({ msg: 'Nenhum campo para atualizar fornecido.' });
    }
    query += ` WHERE cod_servico = $${i++} RETURNING *`;
    params.push(id);

    try {
        const updatedService = await pool.query(query, params);
        if (updatedService.rows.length === 0) {
            return res.status(404).json({ msg: 'Serviço não encontrado' });
        }
        res.json(updatedService.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// DELETE a service
router.delete('/:id', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    try {
        const { id } = req.params;
        // Considerar desativar o serviço ao invés de deletar para manter histórico
        const deletedService = await pool.query('UPDATE servicos SET ativo = FALSE, updated_at = CURRENT_TIMESTAMP WHERE cod_servico = $1 RETURNING *', [id]);
        if (deletedService.rows.length === 0) {
            return res.status(404).json({ msg: 'Serviço não encontrado' });
        }
        res.json({ msg: 'Serviço desativado com sucesso (não deletado fisicamente)' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;