// routes/clientes.js
const express = require('express');
const router = express.Router();
const pool = require('../banco');
const { authenticateToken, authorizeRole } = require('../middleware/auth'); // Importa os middlewares

// GET all clients
router.get('/', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                cod_cliente, cpf, nome_cliente, data_nascimento, email, telefone,
                codigo_ibge, cep, logradouro, numero, complemento, bairro, cidade, uf,
                ativo, ultimo_servico, total_gasto, observacoes_gerais, indicado_por, genero,
                created_at, updated_at
            FROM clientes ORDER BY nome_cliente`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET client by ID
router.get('/:id', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    try {
        const { id } = req.params;
        const client = await pool.query(
            `SELECT
                cod_cliente, cpf, nome_cliente, data_nascimento, email, telefone,
                codigo_ibge, cep, logradouro, numero, complemento, bairro, cidade, uf,
                ativo, ultimo_servico, total_gasto, observacoes_gerais, indicado_por, genero,
                created_at, updated_at
            FROM clientes WHERE cod_cliente = $1`,
            [id]
        );
        if (client.rows.length === 0) {
            return res.status(404).json({ msg: 'Cliente não encontrado' });
        }
        res.json(client.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET client by CPF (NOVA ROTA)
router.get('/cpf/:cpf', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    try {
        const { cpf } = req.params;
        const client = await pool.query(
            `SELECT
                cod_cliente, cpf, nome_cliente, data_nascimento, email, telefone,
                codigo_ibge, cep, logradouro, numero, complemento, bairro, cidade, uf,
                ativo, ultimo_servico, total_gasto, observacoes_gerais, indicado_por, genero,
                created_at, updated_at
            FROM clientes WHERE cpf = $1`,
            [cpf]
        );
        if (client.rows.length === 0) {
            return res.status(404).json({ msg: 'Cliente não encontrado' });
        }
        res.json(client.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// POST a new client
router.post('/', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    const {
        cpf,
        nome_cliente,
        data_nascimento,
        email,
        telefone,
        codigo_ibge,
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        uf,
        senha,
        ativo = true,
        observacoes_gerais,
        indicado_por,
        genero
    } = req.body;

    try {
        // 1. Validação básica de entrada
        if (!cpf || !nome_cliente || !email || !telefone) {
            return res.status(400).json({ msg: 'CPF, nome, email e telefone são campos obrigatórios.' });
        }
        // Adicionar validação de formato de CPF, email, telefone, data_nascimento

        // 2. Verificar se o CPF/email já existe
        let clientExists = await pool.query('SELECT * FROM clientes WHERE cpf = $1 OR email = $2', [cpf, email]);
        if (clientExists.rows.length > 0) {
            if (clientExists.rows[0].cpf === cpf) {
                return res.status(400).json({ msg: 'CPF já está em uso.' });
            }
            if (clientExists.rows[0].email === email) {
                return res.status(400).json({ msg: 'Email já está em uso.' });
            }
        }

        let senha_hash = null;
        if (senha) {
            const salt = await bcrypt.genSalt(10);
            senha_hash = await bcrypt.hash(senha, salt);
        }

        const newClient = await pool.query(
            `INSERT INTO clientes (
                cpf, nome_cliente, data_nascimento, email, telefone,
                codigo_ibge, cep, logradouro, numero, complemento, bairro, cidade, uf,
                senha_hash, ativo, observacoes_gerais, indicado_por, genero
            ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
            [
                cpf, nome_cliente, data_nascimento, email, telefone,
                codigo_ibge, cep, logradouro, numero, complemento, bairro, cidade, uf,
                senha_hash, ativo, observacoes_gerais, indicado_por, genero
            ]
        );
        // Não retornar a senha_hash
        const { senha_hash: returnedSenhaHash, ...clientWithoutHash } = newClient.rows[0];
        res.status(201).json(clientWithoutHash);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// PUT (update) a client
router.put('/:id', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente']), async (req, res) => {
    const { id } = req.params;
    const {
        cpf,
        nome_cliente,
        data_nascimento,
        email,
        telefone,
        codigo_ibge,
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        uf,
        senha, 
        ativo,
        observacoes_gerais,
        indicado_por,
        genero 
    } = req.body;

    let query = 'UPDATE clientes SET ';
    const params = [];
    let i = 1;

    if (cpf !== undefined) { query += `cpf = $${i++}, `; params.push(cpf); }
    if (nome_cliente !== undefined) { query += `nome_cliente = $${i++}, `; params.push(nome_cliente); }
    if (data_nascimento !== undefined) { query += `data_nascimento = $${i++}, `; params.push(data_nascimento); }
    if (email !== undefined) { query += `email = $${i++}, `; params.push(email); }
    if (telefone !== undefined) { query += `telefone = $${i++}, `; params.push(telefone); }
    if (codigo_ibge !== undefined) { query += `codigo_ibge = $${i++}, `; params.push(codigo_ibge); }
    if (cep !== undefined) { query += `cep = $${i++}, `; params.push(cep); }
    if (logradouro !== undefined) { query += `logradouro = $${i++}, `; params.push(logradouro); }
    if (numero !== undefined) { query += `numero = $${i++}, `; params.push(numero); }
    if (complemento !== undefined) { query += `complemento = $${i++}, `; params.push(complemento); }
    if (bairro !== undefined) { query += `bairro = $${i++}, `; params.push(bairro); }
    if (cidade !== undefined) { query += `cidade = $${i++}, `; params.push(cidade); }
    if (uf !== undefined) { query += `uf = $${i++}, `; params.push(uf); }
    if (ativo !== undefined) { query += `ativo = $${i++}, `; params.push(ativo); }
    if (observacoes_gerais !== undefined) { query += `observacoes_gerais = $${i++}, `; params.push(observacoes_gerais); }
    if (indicado_por !== undefined) { query += `indicado_por = $${i++}, `; params.push(indicado_por); }
    if (genero !== undefined) { query += `genero = $${i++}, `; params.push(genero); }

    if (senha !== undefined && senha.trim() !== '') {
        const salt = await bcrypt.genSalt(10);
        const senha_hash = await bcrypt.hash(senha, salt);
        query += `senha_hash = $${i++}, `; params.push(senha_hash);
    }

    query += `updated_at = CURRENT_TIMESTAMP `; // Adiciona atualização do timestamp

    query = query.replace(/,\s*$/, ""); // Remove a última vírgula e espaço
    if (params.length === 0) { // Se nenhum campo foi atualizado
        return res.status(400).json({ msg: 'Nenhum campo para atualizar fornecido.' });
    }
    query += ` WHERE cod_cliente = $${i++} RETURNING *`;
    params.push(id);

    try {
        const updatedClient = await pool.query(query, params);
        if (updatedClient.rows.length === 0) {
            return res.status(404).json({ msg: 'Cliente não encontrado' });
        }
        const { senha_hash: returnedSenhaHash, ...clientWithoutHash } = updatedClient.rows[0];
        res.json(clientWithoutHash);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// DELETE a client
router.delete('/:id', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    try {
        const { id } = req.params;
        // Considerar desativar o cliente ao invés de deletar para manter histórico
        const deletedClient = await pool.query('UPDATE clientes SET ativo = FALSE, updated_at = CURRENT_TIMESTAMP WHERE cod_cliente = $1 RETURNING *', [id]);
        if (deletedClient.rows.length === 0) {
            return res.status(404).json({ msg: 'Cliente não encontrado' });
        }
        res.json({ msg: 'Cliente desativado com sucesso (não deletado fisicamente)' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;