require('dotenv').config(); // Importa e configura o dotenv
const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();

// Configuração do banco de dados puxando do arquivo .env
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});


// Configurações do Express
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// ROTA 1: Exibir a página inicial (index)
app.get('/', (req, res) => {
    res.render('index');
});

// ROTA 2: Exibir a tela de compra
app.get('/comprar', (req, res) => {
    const planoEscolhido = req.query.plano; 
    res.render('comprar', { plano: planoEscolhido });
});

// ROTA 3: Processar o formulário de compra e salvar no banco
app.post('/comprar', async (req, res) => {
    const { plano, nome, email } = req.body;

    try {
        const query = 'INSERT INTO pedidos (plano, nome_cliente, email_cliente) VALUES ($1, $2, $3)';
        const values = [plano, nome, email];
        
        await pool.query(query, values);
        
        res.send('<h1>Pedido realizado com sucesso!</h1><a href="/">Voltar para a Home</a>');
    } catch (erro) {
        console.error('Erro ao salvar pedido:', erro);
        res.status(500).send('Erro ao processar o pedido.');
    }
});

// Iniciar o servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});