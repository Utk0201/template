 const express = require('express')
const router = express.Router();
const path = require('path');
const app= express();
const User = require('../models/user.js');   //  schema of owner
const House = require('../models/house.js');   //  schema of house
const methodOverride = require('method-override');
const multer = require('multer'); //  fills a method 'file' or 'files' in req.body after it has been initialized
//  to initialize multer, we write the following line
const { storage, cloudinary } = require('../cloudinary/cloud');
const geocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapToken= process.env.map_tok;
//  https://gawdiseattle.gitbook.io/wdi/05-node-express/additional-topics/geocode-mapbox using this to set up geocoding client
const geoClient = geocoding({accessToken:mapToken});

var upload = multer({ storage });

// app.set('../views', path.join(__dirname, 'views'));
// console.log(path.join(__dirname, 'views'));

router.get('/', (req, res) => {
    res.render('forms/regUser');   //  for people who want to rent a house
})

router.get('/:id/houses/:houseId', async (req, res) => {
    if (req.isAuthenticated()) {
        const { id, houseId } = req.params;
        const curHouse = await House.findById(houseId);
        res.render('../views/forms/editHouse', { ownerId: id, curHouse });
    }
    else {
        res.redirect('/login');
    }
})

router.get('/:id/edit', (req, res) => {
    // res.send(`At ${req.params.id}`);
    if (req.isAuthenticated()) {
        res.render('forms/editUser');   //  edit details of the user having this id
    }
    else {
        res.redirect('/login');
    }
})

router.get('/:id/add', (req, res) => {
    if (req.isAuthenticated()) {
        const ownerId = req.params.id;
        console.log("Id of owner: ", ownerId);
        res.render('../views/forms/addHouse', { ownerId });
    }
    else {
        res.redirect('/login');
    }
})

router.get('/:id/houses', async (req, res) => {
    if (req.isAuthenticated()) {
        //  to access houses of a particular user, I need to send the user object
        const curUser = await User.findById(req.params.id).populate('houses');
        // res.send(curUser);
        res.render('../views/info/myHouses', { curUser });
    }
    else {
        res.redirect('/login');
    }
})

router.get('/:id', async (req, res) => {
    if (req.isAuthenticated()) {
        // console.log("curUser is:",res.locals.loginUser);
        // console.log("Try: ",req.user._id);
        const { id } = req.params;
        if(req.user._id!=id){
            console.log("Don't try to access others' data");
            res.redirect(`/user/${req.user._id}`);
            // console.log("Not allowed");
        }
        else{
            console.log("allowed!");
        }
        const curUser = await User.findById(id);
        // console.log(res.locals.loginUser+' is the current user');
        res.render('../views/info/user', { curUser });
    }
    else {
        console.log('Please login first');
        res.redirect('/login');
    }
    // res.send(curUser);
})

router.post('/:id/addHouse', upload.array('hImage'), async (req, res) => {
    // res.send('wait');
    // console.log(req.body);
    console.log(req.files);
    const { desc, categ, price, location } = req.body;
    const coordinates = await geoClient.forwardGeocode({    //  fetching latitide and longitude of 'location'
        query: location,
        limit:1
    }).send();
    // res.send("ok");
    const pics = req.files.map(f => ({ url: f.path, filename: f.filename }));
    const oId = req.params.id;
    const aHouse = new House({ desc, categ, price, location });
    aHouse.geometry= coordinates.body.features[0].geometry;
    aHouse.pics = pics;
    if(aHouse.pics.length===0){
        aHouse.pics.push({ url: "https://res.cloudinary.com/dnkbv2p12/image/upload/v1618056628/mDemo/pohmhewyk2hotbb1vydr.jpg", filename: "mDemo/pohmhewyk2hotbb1vydr.jpg" })
    }
    aHouse.owner = oId;
    const user = await User.findById(oId);
    user.houses.push(aHouse._id);
    await user.save();
    await aHouse.save();
    res.redirect(`/user/${user._id}/houses`);
});

router.put('/:id', upload.single('img'), async (req, res) => {
    // res.send('working atleast!!');
    if (req.isAuthenticated()) {
        const { id } = req.params;
        const { oname, oNo, oAddress } = req.body;
        const prevUser = await User.findById(id);
        var profile;
        if (req.file) profile = { url: req.file.path, filename: req.file.filename };
        else profile = prevUser.profile;
        const updUser = await User.findByIdAndUpdate(id, { oname, oNo, oAddress, profile });
        res.redirect(`/user/${updUser._id}`);
    }
    else {
        res.redirect('/login');
    }
});

router.put('/:id/houses/:houseId', upload.array('image'), async (req, res) => {
    if (req.isAuthenticated()) {
        const { categ, price, location, desc } = req.body;
        const { houseId, id } = req.params;
        const updHouse = await House.findByIdAndUpdate(houseId, { categ, price, location, desc });
        console.log(updHouse);
        // updHouse.pics.push(req.files.map(f=>({url:f.path,filename:f.filename})));  
        //  if we run above line, then we're pushing an entire array in 'pics'
        //  but the type of 'pics' is 'object' and not 'array' as specified in the model
        //  So, instead of pushing that array, we extract its object using spread operator '...'
        const addedImages = req.files.map(f => ({ url: f.path, filename: f.filename }));
        if (updHouse.pics.length && updHouse.pics[0].filename === "mDemo/pohmhewyk2hotbb1vydr.jpg") {
            updHouse.pics.pop();
        }
        updHouse.pics.push(...addedImages); //   
        // await updHouse.save();  //  save above changes
        //delete images
        if (req.body.deleteImages) {
            for (let filename of req.body.deleteImages) {
                cloudinary.uploader.destroy(filename);
            }
            if (updHouse.pics.length <= req.body.deleteImages.length) {
                updHouse.pics.push({ url: "https://res.cloudinary.com/dnkbv2p12/image/upload/v1618056628/mDemo/pohmhewyk2hotbb1vydr.jpg", filename: "mDemo/pohmhewyk2hotbb1vydr.jpg" });
            }
            await updHouse.updateOne({ $pull: { pics: { filename: { $in: req.body.deleteImages } } } });
            console.log("After deleting images:", updHouse);
        }
        if (updHouse.pics.length == 0) {
            updHouse.pics.push({ url: "https://res.cloudinary.com/dnkbv2p12/image/upload/v1618056628/mDemo/pohmhewyk2hotbb1vydr.jpg", filename: "mDemo/pohmhewyk2hotbb1vydr.jpg" });
        }
        await updHouse.save();
        res.redirect(`/user/${id}/houses`);
    }
    else {
        res.redirect('/login');
    }
})
/////////////////////////////////////////////put//////////////////////////////////////////////////

/////////////////////////////////////////////delete//////////////////////////////////////////////////
router.delete('/:id', async (req, res) => {
    if (req.isAuthenticated()) {
        const { id } = req.params;
        await User.findByIdAndDelete(id);
        res.redirect('/home');
    }
    else {
        res.redirect('/login');
    }
})


router.delete('/:id/houses/:houseId', async (req, res) => {
    if (req.isAuthenticated()) {
        const { houseId, id } = req.params;
       //   for deleting pics associated with given house
        const curHouse= await House.findById(houseId);
        for (let pic of curHouse.pics){
            cloudinary.uploader.destroy(pic.filename);
        }
        //  delete this id from user.houses also to prevent error in future
        await User.findByIdAndUpdate(id, { $pull: { houses: houseId } });
        await House.findByIdAndDelete(houseId);
        res.redirect(`/user/${id}/houses`);
    }
    else {
        res.redirect('/login');
    }
})

module.exports = router;