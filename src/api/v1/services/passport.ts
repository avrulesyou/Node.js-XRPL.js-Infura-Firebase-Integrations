import {Passport} from 'passport';
import passportGoogle from 'passport-google-oauth20';
import passportTwitter from 'passport-twitter';
import passportDiscord from 'passport-discord'
import db from '../helpers/firebase';
import { v4 } from 'uuid';

// New passport instance and strategies
const passport = new Passport();
const GoogleStrategy = passportGoogle.Strategy;
const TwitterStrategy = passportTwitter.Strategy;
const DiscordStrategy = passportDiscord.Strategy;

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID as string,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    callbackURL: `${process.env.SERVER_URL}/v1/auth/google/redirect`,
}, (accessToken, refreshToken, profile: any, done) => {
    db.collection('users').where('email', "==", profile.emails[0].value).get().then(async (snapshot) => {
        if (snapshot.empty) {
            const userData = {
                createdAt: Date.now(),
                updatedAt: Date.now(),
                username: `user_${v4()}`,
                profileId: profile.id,
                email: profile.emails[0].value,
                name: profile.displayName,
                token: accessToken || refreshToken,
                provider: 'google',
                profilePicture: profile.photos[0].value
            };
            const docRef = await db.collection('users').add(userData)
            docRef.get().then((doc) => {
                done(null, {id: docRef.id, ...doc.data()});
            }).catch(err => {
                done(err, false);
            });
        } else {
            const userDoc = snapshot.docs[0]
            if(userDoc.data().provider !== 'google') {
                done('Email already in use with another provider', undefined);
            }else{
                await userDoc.ref.update({
                    token: accessToken || refreshToken,
                    profilePicture: profile.photos[0].value,
                    updatedAt: Date.now(),
                })
                done(null, { id: userDoc.id, ...userDoc.data()});
            }
        }
    }).catch((err) => {
        done(err, undefined);
    });
}));

// Twitter Strategy
passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_CONSUMER_KEY as string,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET as string,
    callbackURL: `${process.env.SERVER_URL}/v1/auth/twitter/redirect`,
    includeEmail: true,
}, (accessToken, refreshToken, profile: any, done) => {
    db.collection('users').where('email', "==", profile.emails[0].value).get().then(async (snapshot) => {
        if (snapshot.empty) {
            const userData = {
                createdAt: Date.now(),
                updatedAt: Date.now(),
                username: `user_${v4()}`,
                profileId: profile.id,
                twitterUserName: profile.username,
                name: profile.displayName,
                email: profile.emails[0].value,
                token: accessToken || refreshToken,
                provider: 'twitter',
                profilePicture: profile.photos[0].value
            };
            const docRef = await db.collection('users').add(userData)
            docRef.get().then((doc) => {
                done(null, {id: docRef.id, ...doc.data()});
            }).catch(err => {
                done(err, false);
            });
        } else {
            const userDoc = snapshot.docs[0]
            if(userDoc.data().provider !== 'twitter') {
                done('Email already in use with another provider', undefined);
            }else{
                await userDoc.ref.update({
                    twitterUserName: profile.username,
                    token: accessToken || refreshToken,
                    profilePicture: profile.photos[0].value,
                    updatedAt: Date.now(),
                })
                done(null, { id: userDoc.id, ...userDoc.data()});
            }
        }
    }).catch((err) => {
        done(err, undefined);
    });
}));

// Discord Strategy
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID as string,
    clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
    callbackURL: `${process.env.SERVER_URL}/v1/auth/discord/redirect`,
}, (accessToken, refreshToken, profile: any, done: any) => {
    db.collection('users').where('email', "==", profile.email).get().then(async (snapshot) => {
        if (snapshot.empty) {
            const userData = {
                createdAt: Date.now(),
                updatedAt: Date.now(),
                username: `user_${v4()}`,
                profileId: profile.id,
                discordUsername: profile.username,
                name: profile.username,
                email: profile.email,
                token: accessToken || refreshToken,
                provider: 'discord',
                profilePicture: `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
            };
            const docRef = await db.collection('users').add(userData)
            docRef.get().then((doc) => {
                done(null, {id: docRef.id, ...doc.data()});
            }).catch(err => {
                done(err, false);
            });
        } else {
            const userDoc = snapshot.docs[0]
            if(userDoc.data().provider !== 'discord') {
                done('Email already in use with another provider', undefined);
            }else{
                await userDoc.ref.update({
                    discordUserName: profile.username,
                    token: accessToken || refreshToken,
                    profilePicture: profile.photos[0].value,
                    updatedAt: Date.now(),
                })
                done(null, { id: userDoc.id, ...userDoc.data()});
            }
        }
    }).catch((err) => {
        done(err, undefined);
    });
}));

export default passport;