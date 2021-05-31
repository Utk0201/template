if (process.env.NODE_ENV !== "production") {
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
const multer = require('multer'); //  fills a method 'file' or 'files' in req.body after it has been initialized
//  to initialize multer, we write the following line
const userRoutes = require('./routes/user');
const { storage, cloudinary } = require('./cloudinary/cloud');
var upload = multer({ storage });

mongoose.connect('mongodb://localhost:27017/houseApp', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("Connected");
    })
    .catch(e => {
        console.log(e);
    });
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);

// View Engine Setup 
app.engine('ejs', ejsMate)  // provides "layout" feature 
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')


//setting up directory to serve static resources (ex- css)
app.use(express.static(path.join(__dirname, 'public')))     // in my app, everywhere I use src="[some_link]" that 'some_link' will be relative to
// the public directory due to the above line
  
// parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }))
//  set up session before using passport
app.use(session({
    secret: 'asecret',
    saveUninitialized: true,
    resave: false,
    cookie: {
        maxAge: 1000 * 60 * 60   //  auto. logout after 60 min
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
    // console.log("Assigned loginUser",req.user);
    res.locals.loginUser = req.user;  //  allows the variable loginUser to be accessible everywhere
    // console.log(`res.locals containes ${req.user}`);
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

app.get('/sell', (req, res) => {
    res.render('forms/regUser');   //  for people who want to sell a house on rent
})

app.get('/look', async (req, res) => {
    const houses = await House.find({});
    res.render('info/houses', { houses });
})

app.get('/ownerInf/:id/:hId',async (req,res)=>{
    const {id,hId} = req.params;
    const curOwner= await User.findById(id);
    const curHouse= await House.findById(hId);
    // res.send("good to go!");
    res.render('info/ownerInfo',{curUser:curOwner,curHouse:curHouse});
})
/////////////////////////////////////////////get//////////////////////////////////////////////////

/////////////////////////////////////////////post//////////////////////////////////////////////////
app.post('/sell', upload.single('img'), async (req, res, next) => {
    //  uploading single file
    // console.log(req.file);
    // res.send("working fine");
    // const {username,password} = req.body;
    // const aUser = new User({username,password});
    const { oname, oNo, oAddress, password, username } = req.body;
    const aUser = new User({ oname, oNo, password, username, oAddress });
    if (req.file) aUser.profile = { url: req.file.path, filename: req.file.filename };
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
app.put('/del/:id', async (req, res) => {
    const { id } = req.params;
    const aUser = await User.findById(id);
    if(aUser.profile.filename!=="userDp/defU_jybgs8") cloudinary.uploader.destroy(aUser.profile.filename);    //  should not be destroyed always
    console.log("Dp pic:",aUser.profile.filename);
    const { oname, oNo, oAddress, password, username } = aUser;
    const profile = { url: "https://res.cloudinary.com/dnkbv2p12/image/upload/v1619582000/userDp/defU_jybgs8.jpg", filename: "userDp/defU_jybgs8" };
    const nUser = await User.findByIdAndUpdate(id, { oname, oNo, oAddress, password, username, profile });
    console.log(nUser);
    res.redirect(`/user/${id}`);
});
app.use('/user',userRoutes);

/////////////////////////////////////////////delete//////////////////////////////////////////////////
app.get('/', (req, res) => {
    res.send("Welcome to house rent app");
})

app.listen(3000, () => {
    console.log("running at 3k");
})