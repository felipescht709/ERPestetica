// server.js
require('dotenv').config(); // Carrega variáveis de ambiente do .env
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

// Importar rotas
const clientesRoutes = require('./routes/clientes');
const servicosRoutes = require('./routes/servicos');
const agendamentosRoutes = require('./routes/agendamentos');
const dashboardRoutes = require('./routes/dashboard');
const authRoutes = require('./routes/auth'); // Nova rota para autenticação
const userRoutes = require('./routes/usuarios'); // Nova rota para gerenciamento de usuários

// Middlewares
app.use(cors()); // Permite requisições de outras origens (seu frontend)
app.use(express.json()); // Permite que o Express.js entenda JSON no corpo das requisições

// Rotas da API
app.use('/api/auth', authRoutes); // Rotas de login e registro
app.use('/api/clientes', clientesRoutes);
app.use('/api/servicos', servicosRoutes);
app.use('/api/agendamentos', agendamentosRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/usuarios', userRoutes); // Rotas para gerenciar usuários (requer autenticação)

// Rota de teste
app.get('/', (req, res) => {
    res.send('Backend da AutoEstética Central rodando!');
});

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Backend rodando na porta ${PORT}`);
    console.log(`Acesse a API em http://localhost:${PORT}`);
});