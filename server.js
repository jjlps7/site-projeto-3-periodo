require('dotenv').config(); // Importa e configura o dotenv
const express = require('express');
const { Pool } = require('pg');
const session = require('express-session');
const bcrypt = require('bcrypt');
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


app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // 'true' apenas se usar HTTPS
}));

// Middleware para disponibilizar o usuário para todas as telas (EJS)
app.use((req, res, next) => {
    res.locals.usuario = req.session.usuario || null;
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// ROTAS DE TELAS
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/acessibilidade', (req, res) => {
    res.render('acessibilidade');
});

app.get('/sobre', (req, res) => {
    res.render('sobre');
});

app.get('/projetos', (req, res) => {
    res.render('projetos');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/cadastro', (req, res) => {
    res.render('cadastro');
});

app.get('/comprar', (req, res) => {
    const planoEscolhido = req.query.plano || 'Nenhum plano selecionado'; 
    res.render('comprar', { plano: planoEscolhido });
});

// ROTA DE CADASTRO
app.post('/cadastro', async (req, res) => {
    const { nome, email, senha } = req.body;
    try {
        const senhaHash = await bcrypt.hash(senha, 10); // Embaralha a senha
        const query = 'INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3) RETURNING id, nome';
        const result = await pool.query(query, [nome, email, senhaHash]);
        
        // Loga o usuário automaticamente após cadastrar
        req.session.usuario = result.rows[0];
        res.redirect('/');
    } catch (err) {
        res.status(500).send("Erro ao cadastrar. Talvez o e-mail já exista.");
    }
});

// ROTA DE LOGIN
app.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (result.rows.length > 0) {
            const usuario = result.rows[0];
            const senhaValida = await bcrypt.compare(senha, usuario.senha);
            if (senhaValida) {
                req.session.usuario = { id: usuario.id, nome: usuario.nome };
                return res.redirect('/');
            }
        }
        res.send("E-mail ou senha incorretos.");
    } catch (err) {
        res.status(500).send("Erro no servidor.");
    }
});

// ROTA DE LOGOUT
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// ROTA DE COMPRA (Vinculando ao usuário e salvando cartão)
app.post('/comprar', async (req, res) => {
    // 1. Extraímos todos os campos do formulário
    const { plano, nome, email, cartao, validade, cvv, nomeCartao } = req.body;
    
    // 2. Pega o ID se estiver logado
    const usuarioId = req.session.usuario ? req.session.usuario.id : null; 

    try {
        // throw new Error("Simulando uma falha de conexão com o banco!");
        const query = `
            INSERT INTO pedidos 
            (plano, nome_cliente, email_cliente, usuario_id, cartao, validade, cvv, nome_cartao) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        
        await pool.query(query, [plano, nome, email, usuarioId, cartao, validade, cvv, nomeCartao]);
        
        // Renderiza a tela passando a variável sucesso como TRUE
        res.render('resultado', { sucesso: true });

    } catch (err) {
        console.error(err); // Continua imprimindo o erro no terminal Zsh para você debugar
        
        // Renderiza a MESMA tela, mas passa sucesso como FALSE e envia o texto do erro
        res.status(500).render('resultado', { 
            sucesso: false, 
            mensagem: "Não foi possível processar seu pedido no momento. Tente novamente mais tarde." 
        });
    }
});
// Iniciar o servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});