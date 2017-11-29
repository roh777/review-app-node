const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const User = mongoose.model('User');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOptions = {
    storage: multer.memoryStorage(),
    fileFilter(req, file, next) {
        const isPhoto = file.mimetype.startsWith('image/');
        if(isPhoto) {
            next(null, true);
        } else {
            next({ message: 'That filetype isn\'t allow'}, false);
        }
    }
};

exports.homePage = (req, res) => {
    req.flash('info', 'La la La');
    res.render('index');
}

exports.addStore = (req,res) => {
    res.render('editStore', {title : 'Add Store'})
}

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next)=> {
    // check if there is no new file to resize
    if(!req.file) {
        next(); //skip to the next middleware
        return;
    }

    const extension = req.file.mimetype.split('/')[1];
    //give unique ID
    req.body.photo = `${uuid.v4()}.${extension}`;
    //now we resize
    const photo = await jimp.read(req.file.buffer);
    await photo.resize(800, jimp.AUTO);
    await photo.write(`./public/uploads/${req.body.photo}`);
    //once we have written the file to our filesystem
    next();
}

exports.createStore = async (req, res) => {
    //using async await. you have to use try{} catch().
    req.body.author = req.user._id;
    const store = await (new Store(req.body)).save();
    
    console.log('It worked!');
    req.flash('success', `Sucessfully created ${store.name}. Care to leave a review ?`);
    res.redirect(`/store/${store.slug}`);
}

exports.getStores = async (req, res) => {
    //Select the page at which we are at
    const page = req.params.page || 1;
    const limit = 4;
    const skip = (page * limit) - limit;
    //Query the database
    const storesPromise =  Store.find()
                        .skip(skip)
                        .limit(limit)
                        .sort({ created : 'desc'});
    
    const countPromise = Store.count();

    const [stores, count] = await Promise.all([storesPromise, countPromise]);

    const pages  = Math.ceil(count / limit);

    if(!stores.length && skip) {
        req.flash('info', `You asked for page ${page} but that doesn't exits.
        So we have put you on ${pages}`);
        res.redirect(`/stores/page/${pages}`);
        return;
    }

    res.render('stores', {title: 'Stores', stores, count, pages, page});
}

const confirmStore = (user, store) => {
    if(!(store.author && store.author.equals(user))) {
        throw Error('You must own a store to edit it')
    }
}

exports.editStore = async (req, res) => {
    //1. Find the store give the ID
    //2. Make sure they are the owner of the store
    //3. Render out the edit form
    const store = await Store.findOne({_id : req.params.id});
    confirmStore(req.user._id, store);
    res.render('editstore',{title : `Edit ${store.name}`, store}) ;
}

exports.updateStore = async (req, res) => {
    //find and update the store
    const store = await Store.findOneAndUpdate({_id : req.params.id}, req.body, {
        new : true, 
        runValidators: true,

    }).exec();
    //Redirect them to the store
    req.flash('success', `Sucessfully updated <strong>${store.name}</strong>.<a
    href="/stores/${store._id}/edit">View Store</a>`);
    res.redirect(`/stores/${store._id}/edit`);
}

exports.getStoreBySlug = async(req, res,next) => {
    const store = await Store.findOne({slug: req.params.slug})
        .populate('author reviews');
    if(!store) return next(); //same as next(); return;
    res.render('store', {store : store, title : store.name});
}

exports.getStoresByTag = async (req, res, next) => {
    const tag = req.params.tag;
    const tagQuery = tag || { $exists : true };
    const tagsPromise =  Store.getTagsList();
    const storesPromise = Store.find({ tags: tagQuery});
    const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);
    
    res.render('tag', {tags,tag, title: 'Tags', stores})
}

exports.searchStores = async (req, res) => {
    const stores = await Store.find({
        $text : {
            $search : req.query.q
        }
    },
    //this other object will give us a metdata(score)
    //indicating relativeness of stores to search arguments
    {
        score : { $meta : 'textScore'}
    }
    ).sort({
        score : { $meta : 'textScore'}
    })
    //limit to five
    .limit(5);

    res.json(stores);
}

exports.mapStores = async (req, res) => {
    const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
    const q = {
        location : {
            $near : {
                $geometry : {
                    type : 'Point',
                    coordinates
                },
                $maxDistance : 100000 //meters (10km)
            }
        }
    }

    const stores = await Store.find(q)
                              .select("name slug location photo");
    res.json(stores); 
}

exports.mapPage = (req, res) => {
    res.render('map', {title : 'Map'});
}

exports.getHearts = async (req, res) => {
    const stores = await Store.find({
        _id : { $in : req.user.hearts }
    });
    res.render('hearts', {title : 'Hearted Stores', stores});
}

exports.heartStore = async (req, res) => {
    const hearts = req.user.hearts.map(obj => obj.toString());
    const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
    const user = await User
        .findByIdAndUpdate(req.user.id,
        { [operator] : {hearts : req.params.id}},
        { new : true }
    );
    res.json(user);
}

exports.getTopStores = async (req, res) => {
    const stores = await Store.getTopStores();
    res.render('topStores', {title : 'Top Stores', stores});
    // res.sender('topStores', {title : 'Top stores'});
}
