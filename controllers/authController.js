const passport = require('passport');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const crypto = require('crypto');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');

exports.login = passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: 'Failed Login!',
    successRedirect: '/',
    successFlash: 'You are now logged in!'
});

exports.logout = (req, res) => {
    req.logout();
    req.flash('success', 'You are now logged out! 👋');
    res.redirect('/');
};

exports.isLoggedIn = (req, res, next) => {
    // first check if the user is authenticated
    if (req.isAuthenticated()) {
        next(); // carry on! They are logged in!
        return;
    }
    req.flash('error', 'Oops you must be logged in to do that!');
    res.redirect('/login');
};

exports.forgot = async (req, res) => {
    //1. check if that email exists
    const user = await User.findOne({email: req.body.email});
    if(!user) {
        req.flash('error', 'No such registered email exists');
        return res.redirect('/login');
    }
    //2. Generate and save tokens with user
    user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordExpires = Date.now() + 3600000;

    await user.save();
    //3. send the email
    const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;

    await mail.send({
         user: user,
         filename: 'password-reset',
         subject: 'Password reset request',
         resetURL : resetURL,
     })

    req.flash('success', 'You have been sent a reset link to you email');

    res.redirect('/login');

}

exports.reset = async (req, res) => {
    const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now()}
    });

    if(!user) {
        req.flash('error', 'Password reset is invalid or has expired');
        return res.redirect('/login');
    }

    res.render('reset', { title: 'Reset Your Password'});
};

exports.confirmPasswords = (req, res, next)=> {
    if(req.body.password === req.body.confirmpassword) {
        next();
        return;
    }
    req.flash('error', 'Passwords do not match');
    res.redirect('back');
}

exports.update = async (req, res) => {
    const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
    });

    if(!user) {
        req.flash('error', 'Password reset is invalid or expired.');
        return res.redirect('/login');
    }

    const setPassword = promisify(user.setPassword, user);
    await setPassword(req.body.password);
    user.resetPasswordExpires = undefined;
    user.resetPasswordToken = undefined;
    const updatedUser = await user.save();

    await req.login(updatedUser);
    req.flash('success', 'Your password has been reset');
    res.redirect('/');
};