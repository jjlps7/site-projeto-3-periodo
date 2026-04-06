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
    connectionTimeoutMillis: 5000, // Espera no máximo 5 segundos para conectar
    query_timeout: 5000 // Espera no máximo 5 segundos para uma query rodar
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

// Função de segurança para bloquear páginas restritas
const verificarLogin = (req, res, next) => {
    if (req.session.usuario) {
        next(); 
    } else {
        res.status(403).send(`
            <div style="text-align: center; margin-top: 100px; font-family: Arial, sans-serif; color: rgb(0, 37, 92);">
                <h1>Ops! Acesso Negado.</h1>
                <p>Você precisa fazer login para acessar a área de pagamento.</p>
                <img src="https://http.dog/403.jpg" alt="Cachorro de guarda - Erro 403" style="border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); width: 100%; max-width: 750px; height: auto; margin: 20px auto; display: block;">
                <br>
                <a href="/login" style="display: inline-block; padding: 12px 24px; background-color: rgb(0, 37, 92); color: white; text-decoration: none; border-radius: 20px;">Ir para o Login</a>
            </div>
        `);
    }
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// =======================================================================
// MODO DE MANUTENÇÃO (Erro 503) 
// =======================================================================
const emManutencao = false; // Quando precisar atualizar  o banco de dados, mude para 'true'

app.use((req, res, next) => {
    if (emManutencao) {
        res.status(503).send(`
            <div style="text-align: center; margin-top: 100px; font-family: Arial, sans-serif; color: rgb(0, 37, 92);">
                <h1>Voltamos já! (Erro 503)</h1>
                <p>O serviço está temporariamente indisponível. Nossa cabra de engenharia está consertando os cabos do servidor.</p>
                <img src="https://httpgoats.com/503.jpg" alt="Cabra em manutenção - Erro 503" style="border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); width: 100%; max-width: 750px; height: auto; margin: 20px auto; display: block;">
            </div>
        `);
    } else {
        next(); // Se não estiver em manutenção, deixa o site funcionar normal
    }
});

// Configuração do Limite de Requisições (Erro 429)
const rateLimit = require('express-rate-limit');
const limitadorGeral = rateLimit({
    windowMs: 1 * 60 * 1000, // Janela de tempo: 1 minuto (em milissegundos)
    max: 5, // Limite: bloqueia no 6º acesso dentro do mesmo minuto
    handler: (req, res) => {
        // Envia o HTML com a Cabra
        res.status(429).send(`
            <div style="text-align: center; margin-top: 100px; font-family: Arial, sans-serif; color: rgb(0, 37, 92);">
                <h1>Ops! Vai com calma aí. (Erro 429)</h1>
                <p>Você fez muitas tentativas seguidas. A nossa cabra de segurança bloqueou o acesso.<br>Respire um pouco e tente novamente daqui a 1 minuto.</p>
                <img src="https://httpgoats.com/429.jpg" alt="Cabra de guarda - Erro 429" style="border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); width: 100%; max-width: 750px; height: auto; margin: 20px auto; display: block;">
                <br>
                <a href="/" style="display: inline-block; padding: 12px 24px; background-color: rgb(0, 37, 92); color: white; text-decoration: none; border-radius: 20px;">Voltar para a Home</a>
            </div>
        `);
    }
});
// Aplica o limitador EXCLUSIVAMENTE na rota de login (para proteger senhas)
app.use('/login', limitadorGeral);


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

app.get('/comprar', verificarLogin, (req, res) => {
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
        // Substituindo o res.send() simples pela tela do Erro 401
        res.status(401).send(`
            <div style="text-align: center; margin-top: 100px; font-family: Arial, sans-serif; color: rgb(0, 37, 92);">
                <h1>Ops! Acesso Não Autorizado (Erro 401)</h1>
                <p>E-mail ou senha incorretos. O gato da segurança não te reconheceu!</p>
                <img src="https://http.cat/401.jpg" alt="Gato - Erro 401" style="border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); width: 100%; max-width: 750px; height: auto; margin: 20px auto; display: block;">
                <br>
                <a href="/login" style="display: inline-block; padding: 12px 24px; background-color: rgb(0, 37, 92); color: white; text-decoration: none; border-radius: 20px;">Tentar Novamente</a>
            </div>
        `);
    } catch (err) {
        res.status(500).send(`
            <div style="text-align: center; margin-top: 100px; font-family: Arial, sans-serif; color: rgb(0, 37, 92);">
                <h1>Ops! Erro 500.</h1>
                <p>Nosso servidor tropeçou nos cabos ou o banco de dados está tirando uma soneca.</p>
                <img src="https://http.dog/500.jpg" alt="Cachorro - Erro 500" style="border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); width: 100%; max-width: 750px; height: auto; margin: 20px auto; display: block;">
                <br>
                <a href="/" style="display: inline-block; padding: 12px 24px; background-color: rgb(0, 37, 92); color: white; text-decoration: none; border-radius: 20px;">Voltar para a Home</a>
            </div>
        `);
    }
});

// ROTA DE LOGOUT
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// ROTA DE COMPRA (Vinculando ao usuário e salvando cartão)
app.post('/comprar', verificarLogin, async (req, res) => {
    // 1. Extraímos todos os campos do formulário
    const { plano, nome, email, cartao, validade, cvv, nomeCartao } = req.body;
    
    // =======================================================================
    // VALIDAÇÃO DE SEGURANÇA (Erro 400 - Bad Request)
    // =======================================================================
    const planosValidos = ['Básico', 'Profissional', 'Enterprise']; // Ajuste aqui para os nomes exatos dos seus planos!
    
    // Se o plano estiver vazio ou não for um dos três planos oficiais:
    if (!plano || !planosValidos.includes(plano)) {
        return res.status(400).send(`
            <div style="text-align: center; margin-top: 100px; font-family: Arial, sans-serif; color: rgb(0, 37, 92);">
                <h1>Ops! Requisição Inválida (Erro 400)</h1>
                <p>Os dados enviados estão incorretos ou foram adulterados. Não tente enganar o sistema!</p>
                <img src="https://http.dog/400.jpg" alt="Cachorro julgador - Erro 400" style="border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); width: 100%; max-width: 750px; height: auto; margin: 20px auto; display: block;">
                <br>
                <a href="/" style="display: inline-block; padding: 12px 24px; background-color: rgb(0, 37, 92); color: white; text-decoration: none; border-radius: 20px;">Voltar aos Planos</a>
            </div>
        `);
    }
    // =======================================================================

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
        console.error(err);
        
        // Renderiza a MESMA tela, mas passa sucesso como FALSE e envia o texto do erro
        res.status(500).render('resultado', { 
            sucesso: false, 
            mensagem: "Não foi possível processar seu pedido no momento. Tente novamente mais tarde." 
        });
    }
});

// =======================================================================
// BLOQUEIO DE MÉTODO (Erro 405) - Para quem tentar usar PUT, DELETE ou acessar /comprar de forma errada
// =======================================================================
app.all('/comprar', (req, res) => {
    res.status(405).send(`
        <div style="text-align: center; margin-top: 100px; font-family: Arial, sans-serif; color: rgb(0, 37, 92);">
            <h1>Você não pode fazer isso! (Erro 405)</h1>
            <p>O método HTTP que você tentou usar não é permitido nesta rota da Base 5 Automações.</p>
            <img src="https://http.dog/405.jpg" alt="Cachorro bloqueando - Erro 405" style="border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); width: 100%; max-width: 750px; height: auto; margin: 20px auto; display: block;">
            <br>
            <a href="/" style="display: inline-block; padding: 12px 24px; background-color: rgb(0, 37, 92); color: white; text-decoration: none; border-radius: 20px;">Voltar para a Home</a>
        </div>
    `);
});

// ROTA 404 (Página Não Encontrada) - Deve ser sempre a última rota do arquivo!
app.use((req, res) => {
    res.status(404).send(`
        <div style="text-align: center; margin-top: 100px; font-family: Arial, sans-serif; color: rgb(0, 37, 92);">
            <h1>Ops! Página não encontrada.</h1>
            <p>O link que você tentou acessar não existe na Base 5 Automações.</p>
            <img src="https://http.dog/404.jpg" alt="Cachorro cavando buraco - Erro 404" style="border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); width: 100%; max-width: 750px; height: auto; margin: 20px auto; display: block;">
            <br>
            <a href="/" style="display: inline-block; padding: 12px 24px; background-color: rgb(0, 37, 92); color: white; text-decoration: none; border-radius: 20px;">Voltar para a Home</a>
        </div>
    `);
});

// Iniciar o servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});