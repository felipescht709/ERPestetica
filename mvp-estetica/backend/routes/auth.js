// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../banco');

// @route    POST /api/auth/register
// @desc     Registrar usuário
// @access   Public (mas em um SaaS, o registro pode ser restrito ou por convite)
router.post('/register', async (req, res) => {
    const { nome, email, senha, role = 'usuario' } = req.body;

    try {
        // Verificar se o usuário já existe
        let user = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (user.rows.length > 0) {
            return res.status(400).json({ msg: 'Usuário já existe' });
        }

        // Hash da senha
        const salt = await bcrypt.genSalt(10);
        const senha_hash = await bcrypt.hash(senha, salt);

        // Salvar usuário no BD
        const newUser = await pool.query(
            'INSERT INTO usuarios (nome, email, senha_hash, role) VALUES($1, $2, $3, $4) RETURNING id, nome, email, role',
            [nome, email, senha_hash, role]
        );

        // Criar e retornar JWT
        const payload = {
            user: {
                id: newUser.rows[0].id,
                role: newUser.rows[0].role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' }, // Token expira em 1 hora
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route    POST /api/auth/login
// @desc     Autenticar usuário e obter token
// @access   Public
router.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    try {
        // Verificar se o usuário existe
        let user = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return res.status(400).json({ msg: 'Credenciais inválidas' });
        }

        // Verificar senha
        const isMatch = await bcrypt.compare(senha, user.rows[0].senha_hash);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Credenciais inválidas' });
        }

        // Verificar se o usuário está ativo
        if (!user.rows[0].ativo) {
            return res.status(401).json({ msg: 'Sua conta está inativa. Contate o administrador.' });
        }

        // Retornar JWT
        const payload = {
            user: {
                id: user.rows[0].id,
                role: user.rows[0].role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route    GET /api/auth/me
// @desc     Obter dados do usuário logado (usando o token)
// @access   Private
router.get('/me', require('../middleware/auth'), async (req, res) => {
    try {
        const user = await pool.query('SELECT id, nome, email, role, ativo FROM usuarios WHERE id = $1', [req.user.id]);
        res.json(user.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;