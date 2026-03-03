const express = require('express');
var bodyParser = require('body-parser');
const mongoose = require('mongoose');
const fileUpload = require('express-fileupload');
const fs = require('fs');

const path = require('path');

const app = express();

const Posts = require('./Posts.js');

var session = require('express-session');

mongoose.set('strictQuery',true);
mongoose.connect('mongodb+srv://jcfonteneledosantos:jeanetati30@cluster0.jtccn.mongodb.net/dankicode?retryWrites=true&w=majority&appName=Cluster0',{useNewUrlParser: true, useUnifiedTopology: true}).then(function(){
    console.log('Conectado com sucesso no banco de dados!');
}).catch(function(err){
    console.log(err.message);
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

//Upload de arquivos
app.use(fileUpload({
    useTempFiles : true,
    tempFileDir : path.join(__dirname, 'temp')
}));

app.use(session({ secret: 'fjebfjbebfiuefbei', cookie: { maxAge: 60000 }}));

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.use('/public', express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, '/pages'));

app.get('/', (req,res)=>{
    if(req.query.busca == null){
        Posts.find({}).sort({'_id':-1}).exec(function(err,posts){
            //console.log(posts[0]);
            posts = posts.map((val)=>{
                return {
                    titulo: val.titulo,
                    conteudo: val.conteudo,
                    descricaoCurta: val.conteudo.substr(86,450),
                    conteudoMaisLidas: val.conteudo.substr(86,90),
                    imagem: val.imagem,
                    slug: val.slug,
                    categoria: val.categoria
                }
            });

            Posts.find({}).sort({views: -1}).limit(3).exec(function(err, postStop){
                postStop = postStop.map(function(val){
                    return {
                        titulo: val.titulo,
                        conteudo: val.conteudo,
                        descricaoCurta: val.conteudo.substr(86,450),
                        conteudoMaisLidas: val.conteudo.substr(86,90),
                        imagem: val.imagem,
                        slug: val.slug,
                        categoria: val.categoria,
                        views: val.views
                    }
                });

                res.render('home',{posts:posts,postStop:postStop});
            });
        });
    }else{
        //var resposta = {'resposta':req.query.busca};
        Posts.find({titulo: {$regex: req.query.busca,$options: "i"}},function(err,posts){
            //console.log(posts);
            posts = posts.map((val)=>{
                return {
                    titulo: val.titulo,
                    conteudo: val.conteudo,
                    descricaoCurta: val.conteudo.substr(86,450),
                    conteudoMaisLidas: val.conteudo.substr(86,90),
                    imagem: val.imagem,
                    slug: val.slug,
                    categoria: val.categoria
                }
            });
            res.render('busca',{posts:posts, urlPesquisada:req.query.busca, contagem:posts.length});
        });
    }
});

app.get('/:slug', (req,res)=>{
    //res.send(req.params.slug);
    Posts.findOneAndUpdate({slug: req.params.slug}, {$inc: {views: 1}}, {new: true}, function(err, resposta){
        //console.log(resposta);
        if(resposta != null)
            res.render('single',{noticia: resposta});  
        else
            res.redirect('/');
    });
});

var usuarios = [
    {
        login: 'Jean',
        senha: '123456'
    }
];

//validação de login 
app.post('/admin/login',(req,res)=>{
    usuarios.map(function(val){
        if(val.login == req.body.usuario && val.senha == req.body.senha){
            req.session.login = 'Jean';
        }else{
            req.session.login = null;
            //res.send('Login incorreto!');
        }
    });
    res.redirect('/admin/login');
});


//continua validação login para renderizar a tela do painel, e tambem pucha do banco de dados as noticias para renderizar no painel
app.get('/admin/login', (req,res)=>{
    if(req.session.login == null){
        res.render('admin-login');
    }else{
        Posts.find({}).sort({'_id':1}).exec(function(err,posts){
            //console.log(posts[0]);
            posts = posts.map((val)=>{
                return {
                    id: val._id,
                    titulo: val.titulo,
                    conteudo: val.conteudo,
                    descricaoCurta: val.conteudo.substr(86,450),
                    imagem: val.imagem,
                    slug: val.slug,
                    categoria: val.categoria
                }
            });
            res.render('admin-painel',{posts:posts});
        });    
    }
});

//Cria cadastro de noticia para gravar no banco de dados
app.post('/admin/cadastro', (req,res)=>{
    let formato = req.files.arquivo.name.split('.');
    let imagem = "";
    if(formato[formato.length - 1] == "jpg"){
        imagem = new Date().getTime() + '.jpg';
        req.files.arquivo.mv(__dirname+'/public/images/'+imagem);
    }else{
        fs.unlinkSync(req.files.arquivo.tempFilePath);
    }

    Posts.create({
        titulo: req.body.titulo_noticia,
        imagem: __dirname+'/public/images/'+imagem,
        categoria: 'Nenhuma',
        conteudo: req.body.noticia,
        slug: req.body.slug,
        autor: 'Admin',
        views: 0
    });
    res.redirect('/admin/login');
});

//Logica para deletar noticia quando clicar no close
app.get('/admin/deletar/:id', (req,res)=>{
    Posts.deleteOne({_id:req.params.id}).then(function(){
        res.redirect('/admin/login');
    }); 
});

app.listen(5000, ()=>{
    console.log('Servidor rodando!');
});