if(process.env.NODE_ENV != "production")
{
    require('dotenv').config()
}
console.log(process.env)

const express = require("express")
const app = express()
const mongoose = require("mongoose")
const path = require("path")
const methodOverride = require("method-override")
const ejsMate = require("ejs-mate")
const ExpressError = require("./utils/ExpressError.js")
const listingRouter = require("./routes/listing.js")
const reviewRouter = require("./routes/review.js")
const userRouter = require("./routes/user.js")
const session = require("express-session")
const MongoStore = require('connect-mongo');
const flash = require("connect-flash")
const passport = require("passport")
const LocalStrategy = require("passport-local")
const User = require("./models/user.js")
const { error } = require('console')
// const googleAuth = require("./routes/googleAuth.js")
// const logger = require('morgan');
// const SQLiteStore = require('connect-sqlite3')(session);


// const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust"
const dbUrl = process.env.ATLASDB_URL

main().then(()=>{
    console.log("Connected to DB")
}).catch((err)=>{
    console.log(err)
})
async function main(){
    await mongoose.connect(dbUrl)    //we replace MONGO_URL to dbUrl
}
app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))
// app.use(logger('dev'));
app.use(express.urlencoded({extended: true}))
app.use(methodOverride("_method"))
app.engine("ejs", ejsMate)
app.use(express.static(path.join(__dirname, "/public")))


const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24*3600
})

store.on("error", () => {
    console.log("ERROR IN MONGO SESSION STORE", err)
})

const sessionOption = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie:{
        expires: Date.now() + 7*24*60*60*1000,
        maxAge: 7*24*60*60*1000,
        httpOnly: true,
    }
}
// app.use(express.static(path.join(__dirname, 'public')));
// app.use(session({
//   secret: 'keyboard cat',
//   resave: false,
//   saveUninitialized: false,
//   store: new SQLiteStore({ db: 'sessions.db', dir: './var/db' })
// }));
// app.use(session({
//     secret: 'keyboard cat',
//     resave: false,
//     saveUninitialized: false,
//     store: new SQLiteStore({ db: 'sessions.db', dir: './var/db' })
//   }));
//   app.use(passport.authenticate('session'));
// app.get('/',(req,res)=>{
//     res.send("Hi! I am root")
// })



app.use(session(sessionOption))
app.use(flash())

app.use(passport.initialize())
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()))

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
    res.locals.success = req.flash("success")
    res.locals.error = req.flash("error")
    res.locals.currUser = req.user
    if(res.locals.currUser){
    // console.log(res.locals.currUser.username)
    }
    next()
})

// app.get("/demouser", async (req,res)=>{
//     let fakUser = new User({
//         email: "abcd@gmail.com",
//         username: "delta-student2",
//     })
//     let registeredUser = await User.register(fakUser, "helloworld")
//     res.send(registeredUser)
// })

// app.use("/", listingRouter)
app.use("/listings", listingRouter)
app.use("/listings/:id/reviews", reviewRouter)
app.use("/", userRouter)
// app.use("/", googleAuth)

app.all("*", (req,res,next)=>{
    next(new ExpressError(404, "Page Not Found"))
})
app.use((err, req, res, next)=>{
    let {statusCode=500, message="Something went wrong"} = err
    res.render("error.ejs", {message})
})
app.listen(8080,()=>{
    console.log("Server is listening")
})