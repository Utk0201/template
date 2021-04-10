if(process.env.NODE_ENV!=="production"){
    require('dotenv').config(); //  brings key-value pairs of .env file in process.env variable that can be accessed globally
}

const express = require('express');
const app = express();
const path = require('path');
const ejsMate = require('ejs-mate')  //  to use layout feature
const bodyParser = require('body-parser');   /* parse info from forms */
const mongoose = require('mongoose');
const passport = require('passport');
const passportLocal = require('passport-local');
const session = require('express-session')  //  for persistent login
const User = require('./models/user.js');   //  schema of owner
const House = require('./models/house.js');   //  schema of house
const methodOverride = require('method-override');
const multer=require('multer'); //  fills a method 'file' or 'files' in req.body after it has been initialized
//  to initialize multer, we write the following line
const {storage} = require('./cloudinary/cloud');
var upload = multer({storage});

mongoose.connect('mongodb://localhost:27017/houseApp', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("Connected");
    })
    .catch(e => {
        console.log(e);
    })

// View Engine Setup 
app.engine('ejs', ejsMate)  // provides "layout" feature 
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')


//setting up directory to serve static resources (ex- css)
app.use(express.static(path.join(__dirname, 'public')))
// parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }))
//  set up session before using passport
app.use(session({
    secret: 'asecret',
    saveUninitialized: true,
    resave: false,
    cookie: {
        maxAge: 1000 * 60 * 5   //  auto. logout after 5 min
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
app.use((req, res, next) => {
    res.locals.loginUser = req.user;  //  allows the variable loginUser to be accessible everywhere
    next();
})
app.use(methodOverride('_method'));
/////////////////////////////////////////////get//////////////////////////////////////////////////
app.get('/home', (req, res) => {
    // console.log(req.user+' is the current user');
    if (req.isAuthenticated()) {
        console.log("You are logged in");
    }
    res.render('layout/index');
})

app.get('/user', (req, res) => {
    res.render('forms/regUser');   //  for people who want to rent a house
})

app.get('/login', (req, res) => {
    res.render('forms/loginUser');
})

app.get('/logout', (req, res) => {
    if (req.isAuthenticated()) {
        // passport exposes a logout() function on req (also aliased as logOut()) that can be called from any route 
        // handler which needs to terminate a login session. Invoking logout() will remove the req.user property and clear the login session (if any).
        req.logout();
        console.log(req.session);
        res.redirect('/home');
    } else {
        res.redirect('/login');
    }
})

app.get('/user/:id/houses/:houseId', async (req, res) => {
    if (req.isAuthenticated()) {
        const { id, houseId } = req.params;
        const curHouse = await House.findById(houseId);
        res.render('forms/editHouse', { ownerId: id, curHouse });
    }
    else {
        res.redirect('/login');
    }
})

app.get('/user/:id/edit', (req, res) => {
    // res.send(`At ${req.params.id}`);
    if (req.isAuthenticated()) {
        res.render('forms/editUser');   //  edit details of the user having this id
    }
    else {
        res.redirect('/login');
    }
})

app.get('/user/:id/add', (req, res) => {
    if (req.isAuthenticated()) {
        const ownerId = req.params.id;
        console.log("Id of owner: ", ownerId);
        res.render('forms/addHouse', { ownerId });
    }
    else {
        res.redirect('/login');
    }
})

app.get('/user/:id/houses', async (req, res) => {
    if (req.isAuthenticated()) {
        //  to access houses of a particular user, I need to send the user object
        const curUser = await User.findById(req.params.id).populate('houses');
        // res.send(curUser);
        res.render('info/myHouses', { curUser });
    }
    else {
        res.redirect('/login');
    }
})

app.get('/user/:id', async (req, res) => {
    if (req.isAuthenticated()) {
        const { id } = req.params;
        const curUser = await User.findById(id);
        // console.log(res.locals.loginUser+' is the current user');
        res.render('info/user', { curUser });
    }
    else {
        console.log('Please login first');
        res.redirect('/login');
    }
    // res.send(curUser);
})

app.get('/sell', (req, res) => {
    res.render('forms/regUser');   //  for people who want to sell a house on rent
})

app.get('/look', (req, res) => {
    res.render('info/houses', { houses });
})

app.get('/secret', (req, res) => {
    if (req.isAuthenticated()) {
        res.send('Welcome to secret society of buyers');
    }
    else {
        res.redirect('/login');
    }
})
/////////////////////////////////////////////get//////////////////////////////////////////////////

/////////////////////////////////////////////post//////////////////////////////////////////////////

app.post('/sell', upload.single('img'),async (req, res, next) => { 
    //  uploading single file
    // console.log(req.file);
    // res.send("working fine");
    // const {username,password} = req.body;
    // const aUser = new User({username,password});
    const { oname, oNo, oAddress, password, username } = req.body;
    const aUser = new User({ oname, oNo, password, username, oAddress });
    if(req.file) aUser.profile={url:req.file.path,filename:req.file.filename};
    console.log(aUser);
    // res.send('Wait !!');
    const regUser = await User.register(aUser, password);
    // Passport exposes a login() function on req (also aliased as logIn()) that can be used to establish a login session.
    req.login(regUser, e => {
        if (e) return next(e);
        res.redirect(`/user/${aUser._id}`);
    })

    console.log(regUser);
    res.redirect('/home');
});

app.post('/user/:id/addHouse', async (req, res) => {
    // res.send(req.body);
    const { desc, categ, price, location } = req.body;
    const oId = req.params.id;
    const aHouse = new House({ desc, categ, price, location });
    aHouse.owner = oId;
    const user = await User.findById(oId);
    user.houses.push(aHouse._id);
    await user.save();
    await aHouse.save();
    res.redirect(`/user/${user._id}/houses`);
    // res.send(user);
})

// Passport provides an authenticate() function, which is used as route middleware to authenticate requests.
app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }), async (req, res) => {
    // console.log(req.user+' is the current user');
    const curUser = await User.find({ username: req.body.username });   //  returns an array of objects which are matching the condition
    console.log(curUser);
    console.log(req.session);
    // console.log(curUser[0]._id);
    res.redirect(`/user/${curUser[0]._id}`)
    // res.redirect(`/user/60509e85711bae3b9429b709`)
});
/////////////////////////////////////////////post//////////////////////////////////////////////////


/////////////////////////////////////////////put//////////////////////////////////////////////////
app.put('/user/:id',upload.single('img'),async (req, res) => {
    // res.send('working atleast!!');
    if (req.isAuthenticated()) {
        const { id } = req.params;
        const { oname, oNo, oAddress} = req.body;
        var profile;
        if(req.file) profile={url:req.file.path,filename:req.file.filename};
        const updUser = await User.findByIdAndUpdate(id, { oname, oNo, oAddress,profile});
        res.redirect(`/user/${updUser._id}`);
    }
    else {
        res.redirect('/login');
    }
})

app.put('/user/:id/houses/:houseId', async (req, res) => {
    if (req.isAuthenticated()) {
        const { categ, price, location, desc } = req.body;
        const { houseId, id } = req.params;
        const updHouse = await House.findByIdAndUpdate(houseId, { categ, price, location, desc });
        res.redirect(`/user/${id}/houses`);
    }
    else {
        res.redirect('/login');
    }
})
/////////////////////////////////////////////put//////////////////////////////////////////////////

/////////////////////////////////////////////delete//////////////////////////////////////////////////
app.delete('/user/:id', async (req, res) => {
    if (req.isAuthenticated()) {
        const { id } = req.params;
        await User.findByIdAndDelete(id);
        res.redirect('/home');
    }
    else {
        res.redirect('/login');
    }
})


app.delete('/user/:id/houses/:houseId', async (req, res) => {
    if (req.isAuthenticated()) {
        const { houseId, id } = req.params;
        //  delete this id from user.houses also to prevent error in future
        await User.findByIdAndUpdate(id, { $pull: { houses: houseId } });
        await House.findByIdAndDelete(houseId);
        res.redirect(`/user/${id}/houses`);
    }
    else {
        res.redirect('/login');
    }
})

/////////////////////////////////////////////delete//////////////////////////////////////////////////
app.get('/', (req, res) => {
    res.send("Welcome to house rent app");
})

app.listen(3000, () => {
    console.log("running at 3k");
})