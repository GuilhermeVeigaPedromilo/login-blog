const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const bodyParser = require('body-parser');
const app = express();

// Configurar a conexão com o banco de dados MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'phpmyadmin',
    password: '0z0x0c0v0b0n0m',
    database: 'mydb',
});

db.connect((err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
        throw err;
    }
    console.log('Conexão com o banco de dados MySQL estabelecida.');
});

// Configurar a sessão
app.use(
    session({
        secret: 'Escreva aqui a senha para criptografar as sessões.',
        resave: true,
        saveUninitialized: true,
    })
);

// Configuração de pastas com aquivos estáticos
//app.use('/img', express.static(__dirname + '/img'))
app.use('/', express.static(__dirname + '/static'));

// Engine do Express para processar o EJS (templates)
// Lembre-se que para uso do EJS uma pasta (diretório) 'views', precisa existir na raiz do projeto.
// E que todos os EJS serão processados a partir desta pasta
app.use(bodyParser.urlencoded({ extended: true }));

// Configurar EJS como o motor de visualização
app.set('view engine', 'ejs');

// Configuração das rotas do servidor HTTP
// A lógica ddo processamento de cada rota deve ser realizada aqui
app.get('/', (req, res) => {
    // Passe a variável 'req' para o template e use-a nas páginas para renderizar partes do HTML conforme determinada condição
    // Por exemplo de o usuário estive logado, veja este exemplo no arquivo views/partials/header.ejs
    console.log(`/login -> session = ${JSON.stringify(req.session)}`);
    res.render('pages/index', { req: req });
    // Caso haja necessidade coloque pontos de verificação para verificar pontos da sua logica de negócios
    console.log(`${req.session.username ? `Usuário ${req.session.username} logado no IP ${req.connection.remoteAddress} TypeUser ${req.session.typeuser}` : 'Usuário não logado.'}  `);
    //console.log(req.connection)
    ;
});

// Rota para a página de login
app.get('/login', (req, res) => {
    // Quando for renderizar páginas pelo EJS, passe parametros para ele em forma de JSON

    res.render('pages/login', { req: req });
});


app.get('/about', (req, res) => {

    res.render('pages/about', { req: req });
});

app.get('/Posts', (req, res) => {
    const selectCount = 'SELECT COUNT(*) AS total_linhas FROM posts';
    const selectPosts = 'SELECT * FROM posts';

    db.query(selectCount, (err, countResult) => {
        if (err) {
            console.error('Erro ao contar linhas:', err);
            throw err;
        }

        db.query(selectPosts, (err, postsResult) => {
            if (err) {
                console.error('Erro ao recuperar posts:', err);
                throw err;
            }

            const totalLinhas = countResult[0].total_linhas;
            res.render('pages/Posts', { req: req, posts: postsResult, TotaldeLinhas: totalLinhas });
            console.log({ TotaldeLinhas: totalLinhas });
        });
    });
});


app.get('/PostsDelete', (req, res) => {

    db.query('DELETE FROM posts', (err, result) => {
        if (err) throw err;
        res.redirect("/Posts")
    });
});

app.get('/myposts', (req, res) => {
    const selectCount = 'SELECT COUNT(*) AS total_linhas FROM posts WHERE nome=?';
    const selectPostsRow = 'SELECT * FROM posts WHERE nome=?';

    db.query(selectCount, [req.session.username], (err, countResult) => {
        if (err) {
            console.error('Erro ao contar linhas:', err);
            throw err;
        }

        db.query(selectPostsRow, [req.session.username], (err, row) => {
            if (err) {
                console.error('Erro ao recuperar posts:', err);
                throw err;
            }

            const totalLinhasrow = countResult[0].total_linhas;
            res.render('pages/myposts', { req: req, dados: row, TotaldeLinhas: totalLinhasrow });
            console.log(`rota /myposts - ${JSON.stringify(row)}`);
        });
    });
});


app.get('/myposts/:id', (req, res) => {
    const id = req.params.id;

    db.query('DELETE FROM posts WHERE id=?', [id], (err, row)=> {
        console.log("Selecionei a postagem de id:", id);
        res.redirect('/myposts');
    });
  });

  app.get('/updatepost/:id', (req, res) => {
    const id = req.params.id;
    const selectPost = 'SELECT * FROM posts WHERE id=?';

    db.query(selectPost, [id], (err, result) => {
        if (err) {
            console.error('Erro ao recuperar post:', err);
            throw err;
        }

        // Renderiza a página de edição de post com os dados do post recuperado
        res.render('pages/updatepost', { req: req, post: result[0] });
    });
});

app.post('/updatepost/:postid', (req, res) => {
    const postid = req.params.postid;
    const { titulo, conteudo } = req.body;

    const updatePost = 'UPDATE posts SET titulo=?, conteudo=? WHERE id=?';

    db.query(updatePost, [titulo, conteudo, postid], (err, result) => {
        if (err) {
            console.error('Erro ao atualizar post:', err);
            throw err;
        }

        // Redireciona para a página de exibição do post após a atualização
        res.redirect('/myposts');
    });
});


  app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const query = 'SELECT * FROM users WHERE username = ? AND password = SHA1(?) ';

    db.query(query, [username, password], (err, results) => {
        if (err) throw err;
        console.log(`${JSON.stringify(results)}`)
        if (results.length > 0) {
            req.session.loggedin = true;
            req.session.username = username;
            req.session.typeuser = results[0].typeuser; // Assim typeuser não deixa de funcionar e fique como 'undefined'
            res.redirect('/dashboard');

            console.log(`${req.session.username ? `Usuário ${req.session.username} logado no IP ${req.connection.remoteAddress} TypeUser ${req.session.typeuser}` : 'Usuário não logado.'}  `);

        } else {
            // res.send('Credenciais incorretas. <a href="/">Tente novamente</a>');
            res.redirect('/login_failed');
        }
    });
});


// Rota para processar o formulário de caastro depostagem
app.post('/cadastrar_posts', (req, res) => {
    const { titulo, conteudo } = req.body;
    const nome = req.session.username;
    const data = new Date();

    // const query = 'SELECT * FROM users WHERE username = ? AND password = SHA1(?)';
    const query = 'INSERT INTO posts (titulo, conteudo, data, nome) VALUES (?, ?, ?, ?)';

    db.query(query, [titulo, conteudo, data, nome], (err, results) => {
        if (err) throw err;
        console.log(`Rotina cadastrar posts: ${JSON.stringify(results)}`);
        if (results.affectedRows > 0) {
            console.log('Cadastro de postagem OK')
            res.redirect('/dashboard');
        } else {
            // res.send('Credenciais incorretas. <a href="/">Tente novamente</a>');
            res.send('Cadastro de post não efetuado');
        }
    });
});

// const query = 'INSERT INTO users (username, password) VALUES (?, SHA1(?))';
// console.log(`POST /CADASTRAR -> query -> ${query}`);
// db.query(query, [username, password], (err, results) => {
//     console.log(results);
//     //console.log(`POST /CADASTAR -> results -> ${results}`);

//     if (err) {
//         console.log(`ERRO NO CADASTRO: ${err}`);
//         throw err;
//     }
//     if (results.affectedRows > 0) {
//         req.session.loggedin = true;
//         req.session.username = username;
//         res.redirect('/register_ok');
//     }
// });


// Rota para a página cadastro do post
app.get('/cadastrar_posts', (req, res) => {
    // Quando for renderizar páginas pelo EJS, passe parametros para ele em forma de JSON
    if (req.session.loggedin) {
        res.render('pages/cadastrar_posts', { req: req });
    } else {
        res.redirect('/login_failed');
    }
});

// Rotas para cadastrar
app.get('/cadastrar', (req, res) => {
    if (!req.session.loggedin) {
        res.render('pages/cadastrar', { req: req });
    } else {
        res.redirect('pages/dashboard', { req: req });
    }
});

// Rota para efetuar o cadastro de usuário no banco de dados
app.post('/cadastrar', (req, res) => {
    const { username, password, typeuser } = req.body;

    // Verifica se o usuário já existe
    const query = 'SELECT * FROM users WHERE username = ? AND password = SHA1(?)';
    db.query(query, [username, password, typeuser], (err, results) => {
        if (err) throw err;
        // Caso usuário já exista no banco de dados, redireciona para a página de cadastro inválido
        if (results.length > 0) {
            console.log(`Usuário ${username} já existe no banco de dados. redirecionando`);
            res.redirect('/register_failed');
        } else {
            // Cadastra o usuário caso não exista
            const query = 'INSERT INTO users (username, password, typeuser) VALUES (?, SHA1(?), "user")';
            console.log(`POST /CADASTRAR -> query -> ${query}`);
            db.query(query, [username, password, typeuser], (err, results) => {
                console.log(results);
                //console.log(`POST /CADASTRAR -> results -> ${results}`);

                if (err) {
                    console.log(`ERRO NO CADASTRO: ${err}`);
                    throw err;
                }
                if (results.affectedRows > 0) {
                    req.session.loggedin = true;
                    req.session.username = username;
                    res.redirect('/register_ok');
                }
            });
        }
    });
});

app.get('/register_failed', (req, res) => {
    res.render('pages/register_failed', { req: req });
});

app.get('/register_ok', (req, res) => {
    res.render('pages/register_ok', { req: req });
});

app.get('/login_failed', (req, res) => {
    res.render('pages/login_failed', { req: req });
});

// Rota para a página do painel
app.get('/dashboard', (req, res) => {
    //
    //modificação aqui
    if (req.session.loggedin) {
        //res.send(`Bem-vindo, ${req.session.username}!<br><a href="/logout">Sair</a>`);
        // res.sendFile(__dirname + '/index.html');
        res.render('pages/dashboard', { req: req });
    } else {
        res.send('Faça login para acessar esta página. <a href="/">Login</a>');
    }
});

// Rota para processar a saida (logout) do usuário
// Utilize-o para encerrar a sessão do usuário
// Dica 1: Coloque um link de 'SAIR' na sua aplicação web
// Dica 2: Você pode implementar um controle de tempo de sessão e encerrar a sessão do usuário caso este tempo passe.
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// Rota de teste
app.get('/teste', (req, res) => {
    res.render('pages/teste', { req: req });
});


app.listen(3000, () => {
    console.log('----Login (MySQL version)-----')
    console.log('Servidor rodando na porta 3000');
});
