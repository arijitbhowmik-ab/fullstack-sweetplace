const express = require('express');
const router = express.Router()
const passport = require('passport');
const GoogleStrategy = require('passport-google-oidc');
const userController = require("../controllers/users.js")
let db = require('../db');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client('GOOGLE_CLIENT_ID');
// router.route('/login/federated/google')
// .get(passport.authenticate('google'));
// router.route('/oauth2/redirect/google')
// .get(passport.authenticate('google', {
//     successRedirect: '/',
//     failureRedirect: '/login'
//   }));
passport.use(new GoogleStrategy({
    clientID: process.env['GOOGLE_CLIENT_ID'],
    clientSecret: process.env['GOOGLE_CLIENT_SECRET'],
    callbackURL: '/oauth2/redirect/google',
    scope: [ 'profile' ]
  }, function verify(issuer, profile, cb) {
    db.get('SELECT * FROM federated_credentials WHERE provider = ? AND subject = ?', [
      issuer,
      profile.id
    ], function(err, row) {
      if (err) { return cb(err); }
      if (!row) {
        db.run('INSERT INTO users (name) VALUES (?)', [
          profile.displayName
        ], function(err) {
          if (err) { return cb(err); }
  
          var id = this.lastID;
          db.run('INSERT INTO federated_credentials (user_id, provider, subject) VALUES (?, ?, ?)', [
            id,
            issuer,
            profile.id
          ], function(err) {
            if (err) { return cb(err); }
            var user = {
              id: id,
              name: profile.displayName
            };
            return cb(null, user);
          });
        });
      } else {
        db.get('SELECT * FROM users WHERE id = ?', [ row.user_id ], function(err, row) {
          if (err) { return cb(err); }
          if (!row) { return cb(null, false); }
          return cb(null, row);
        });
      }
    });
  }));

  passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, { id: user.id, username: user.username, name: user.name });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

// router.get('/login', function(req, res, next) {
//     res.render('login.ejs');
//   });

  router.get(userController.renderLoginForm)
  router.get('/login/federated/google', passport.authenticate('google'));

router
.get('/oauth2/redirect/google', passport.authenticate('google', {
    successReturnToOrRedirect: '/listings',
    failureRedirect: '/login'
  }));

  // if (auth2.isSignedIn.get()) {
  //   var profile = auth2.currentUser.get().getBasicProfile();
  //   console.log('ID: ' + profile.getId());
  //   console.log('Full Name: ' + profile.getName());
  //   console.log('Given Name: ' + profile.getGivenName());
  //   console.log('Family Name: ' + profile.getFamilyName());
  //   console.log('Image URL: ' + profile.getImageUrl());
  //   console.log('Email: ' + profile.getEmail());
  // }

  // async function verify(token) {
  //   const ticket = await client.verifyIdToken({
  //       idToken: token,
  //       audience: process.env.GOOGLE_CLIENT_ID,
  //   });
  //   const payload = ticket.getPayload();
  //   const userName = payload['name'];
  //   console.log('User Name:', userName);
  // }
  // verify()

// router.post('/logout', function(req, res, next) {
//   req.logout(function(err) {
//     if (err) { return next(err); }
//     res.redirect('/');
//   });
// });
module.exports = router