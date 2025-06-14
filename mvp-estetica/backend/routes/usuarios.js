// routes/usuarios.js
const express = require('express');
const router = express.Router();
const pool = require('../banco');
const auth = require('../middleware/auth'); // Middleware de autenticação
const bcrypt = require('bcryptjs');

// Middleware para verificar se o usuário é admin
const checkAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Acesso negado. Apenas administradores.' });
    }
    next();
};

// @route    GET /api/usuarios
// @desc     Listar todos os usuários (apenas para admins)
// @access   Private (Admin)
router.get('/', auth, checkAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, nome, email, role, ativo, data_cadastro FROM usuarios ORDER BY nome');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route    POST /api/usuarios
// @desc     Criar novo usuário (apenas para admins)
// @access   Private (Admin)
router.post('/', auth, checkAdmin, async (req, res) => {
    const { nome, email, senha, role = 'usuario', ativo = true } = req.body;
    try {
        let user = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (user.rows.length > 0) {
            return res.status(400).json({ msg: 'Email já está em uso' });
        }

        const salt = await bcrypt.genSalt(10);
        const senha_hash = await bcrypt.hash(senha, salt);

        const newUser = await pool.query(
            'INSERT INTO usuarios (nome, email, senha_hash, role, ativo) VALUES($1, $2, $3, $4, $5) RETURNING id, nome, email, role, ativo, data_cadastro',
            [nome, email, senha_hash, role, ativo]
        );
        res.json(newUser.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route    PUT /api/usuarios/:id
// @desc     Atualizar dados do usuário (apenas para admins)
// @access   Private (Admin)
router.put('/:id', auth, checkAdmin, async (req, res) => {
    const { id } = req.params;
    const { nome, email, role, ativo, senha } = req.body;
    let query = 'UPDATE usuarios SET ';
    const params = [];
    let i = 1;

    if (nome !== undefined) { query += `nome = $${i++}, `; params.push(nome); }
    if (email !== undefined) { query += `email = $${i++}, `; params.push(email); }
    if (role !== undefined) { query += `role = $${i++}, `; params.push(role); }
    if (ativo !== undefined) { query += `ativo = $${i++}, `; params.push(ativo); }
    if (senha !== undefined) {
        const salt = await bcrypt.genSalt(10);
        const senha_hash = await bcrypt.hash(senha, salt);
        query += `senha_hash = $${i++}, `; params.push(senha_hash);
    }

    query = query.slice(0, -2); // Remove a última vírgula e espaço
    query += ` WHERE id = $${i++} RETURNING id, nome, email, role, ativo, data_cadastro`;
    params.push(id);

    try {
        const updatedUser = await pool.query(query, params);
        if (updatedUser.rows.length === 0) {
            return res.status(404).json({ msg: 'Usuário não encontrado' });
        }
        res.json(updatedUser.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route    DELETE /api/usuarios/:id
// @desc     Deletar usuário (apenas para admins)
// @access   Private (Admin)
router.delete('/:id', auth, checkAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const deletedUser = await pool.query('DELETE FROM usuarios WHERE id = $1 RETURNING *', [id]);
        if (deletedUser.rows.length === 0) {
            return res.status(404).json({ msg: 'Usuário não encontrado' });
        }
        res.json({ msg: 'Usuário deletado com sucesso' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;