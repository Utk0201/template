const express=require('express');
const app=express();
const path=require('path');
const ejsMate= require('ejs-mate')  //  to use layout feature
const bodyParser= require('body-parser');   /* parse info from forms */
const mongoose= require('mongoose');
const passport = require('passport');
const passportLocal = require('passport-local');
const session = require('express-session')  //  for persistent login
const User = require('./models/user.js');
const methodOverride = require('method-override');

mongoose.connect('mongodb://localhost:27017/houseApp', {useNewUrlParser: true, useUnifiedTopology: true})
.then(()=>{
    console.log("Connected");
})
.catch(e=>{
    console.log(e);
})

// View Engine Setup 
app.engine('ejs', ejsMate)  // provides "layout" feature 
app.set('views', path.join(__dirname, 'views')) 
app.set('view engine', 'ejs') 


//setting up directory to serve static resources (ex- css)
app.use( express.static(path.join(__dirname, 'public')))
// parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }))
//  set up session before using passport
app.use(session({
    secret: 'asecret',
    saveUninitialized:true,
    resave:false,
    cookie:{
        maxAge: 1000*60*5   //  auto. logout after 5 min
    }
}));
//  set up passport for express or connect based application (express in our case) https://www.npmjs.com/package/passport
app.use(passport.initialize()); // use this middleware for implementing login 
app.use(passport.session()); //  to use persistent login sessions
// use static authenticate method of model in passportLocal
passport.use(new passportLocal(User.authenticate()));
// use static serialize and deserialize of model for passport session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use((req,res,next)=>{
    res.locals.loginUser=req.user;  //  allows the variable loginUser to be accessible everywhere
    next();
})
app.use(methodOverride('_method'));
/////////////////////////////////////////////get//////////////////////////////////////////////////
app.get('/home',(req,res)=>{
    // console.log(req.user+' is the current user');
    if(req.isAuthenticated()){
        console.log("You are logged in");
    }
    res.render('layout/index');
})

app.get('/user',(req,res)=>{
    res.render('forms/regUser');   //  for people who want to rent a house
})

app.get('/login',(req,res)=>{
    res.render('forms/loginUser');
})

app.get('/logout',(req,res)=>{
    // passport exposes a logout() function on req (also aliased as logOut()) that can be called from any route 
    // handler which needs to terminate a login session. Invoking logout() will remove the req.user property and clear the login session (if any).
    req.logout();
    console.log(req.session);
    res.redirect('/home');
})

app.get('/user/:id/edit',(req,res)=>{
    // res.send(`At ${req.params.id}`);
    if(req.isAuthenticated()){
        res.render('forms/editUser');   //  edit details of the user having this id
    }
    else{
        res.redirect('/home');
    }
})

app.get('/user/:id',async (req,res)=>{
    if(req.isAuthenticated()){
        const {id}= req.params;
        const curUser = await User.findById(id);
        // console.log(res.locals.loginUser+' is the current user');
        res.render('info/user',{curUser});
    }
    else{
        console.log('Please login first');
        res.redirect('/login');
    }
    // res.send(curUser);
})

app.get('/sell',(req,res)=>{
    res.render('forms/regUser');   //  for people who want to sell a house on rent
})

app.get('/look',(req,res)=>{
    res.render('info/houses',{houses});
})

app.get('/secret',(req,res)=>{
    if(req.isAuthenticated()){
        res.send('Welcome to secret society of buyers');
    }
    else{
        res.redirect('/login');
    }
})

/////////////////////////////////////////////get//////////////////////////////////////////////////

/////////////////////////////////////////////post//////////////////////////////////////////////////

app.post('/sell',async (req,res,next)=>{
    // const {username,password} = req.body;
    // const aUser = new User({username,password});
    const {oname,oNo,password,username,oAddress} = req.body;
    const aUser = new User({oname,oNo,password,username,oAddress});
    const regUser= await User.register(aUser,password);
    // Passport exposes a login() function on req (also aliased as logIn()) that can be used to establish a login session.
    req.login(regUser,e=>{
        if(e) return next(e);
        // res.redirect(`/user/${aUser._id}`);
        // console.log(regUser);
        // console.log(aUser._id);
        res.redirect(`/user/${aUser._id}`);
    })
    
    // console.log(regUser);
    res.redirect('/home');
})


// Passport provides an authenticate() function, which is used as route middleware to authenticate requests.
app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }),async (req, res)=>{
    // console.log(req.user+' is the current user');
    const curUser= await User.find({username:req.body.username});   //  returns an array of objects which are matching the condition
    console.log(curUser);
    console.log(req.session);
    // console.log(curUser[0]._id);
    res.redirect(`/user/${curUser[0]._id}`)
    // res.redirect(`/user/60509e85711bae3b9429b709`)
});

/////////////////////////////////////////////post//////////////////////////////////////////////////


/////////////////////////////////////////////put//////////////////////////////////////////////////
app.put('/user/:id',async (req,res)=>{
    // res.send('working atleast!!');
    const {id}= req.params;
    const {oname,oNo,oAddress}=req.body;
    const updUser=await User.findByIdAndUpdate(id,{oname,oNo,oAddress});
    res.redirect(`/user/${updUser._id}`);
})
/////////////////////////////////////////////put//////////////////////////////////////////////////

/////////////////////////////////////////////delete//////////////////////////////////////////////////
app.delete('/user/:id',async (req,res)=>{
    const {id} = req.params;
    await User.findByIdAndDelete(id);
    res.redirect('/home');
})
/////////////////////////////////////////////delete//////////////////////////////////////////////////
app.get('/',(req,res)=>{
    res.send("Welcome to house rent app");
})

app.listen(3000,()=>{
    console.log("running at 3k");
})