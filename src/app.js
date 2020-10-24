require('dotenv').config()
var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cors = require("cors");

var testAPIRouter = require("./routes/testAPI");

var app = express();
var http = require("http").createServer(app);
var io = require("socket.io")(http);

var score = [];
var question = 0;
var answered = 0;
var questions = [
   {
      question: 'In Which City Can The Mage\'s Guild Be Found?',
      answers: ['Winterhold', 'Riften', 'Whiterun', 'Riften'],
      correct: [1],
      trick: [0],
      type: 1,
   },
   {
      question: 'Trick Question',
      answers: ['Winterhold', 'Riften', 'Whiterun', 'Riften'],
      correct: [5],
      trick: [1,2,3,4],
      type: 1,
   },
   {
      question: 'What town/city is this?',
      img: 'https://i.imgur.com/xoNnmxK.png',
      answers: ['Whiterun', 'Winterhold', 'Windstad', 'Windhelm'],
      correct: [4],
      trick: [3],
      type: 2,
   },
];

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(cors(/*{origin: 'https://example.com'}*/));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.use("/", testAPIRouter);

const mergeArrayWithObject = (arr, obj) => arr && arr.map(t => t.id === obj.id ? obj : t);

io.on('connection', function(socket){
   socket.on('join', ({name, room}) => {
      console.log(name, "joining", room)
      io.emit('players', {name})
      let temp = {name: name, score:0}
      score.push(temp)
   })

   socket.on('host', () => {
      var room = Math.floor((Math.random() * 9999) + 1);
      console.log('Host Session Started', room)
      io.emit('host', {room})
      score = []
      question = 0
   })

   socket.on('start', () => {
      try {
         var q = questions[question].question;
         if (questions[question].type === 2) {
            var i = questions[question].img
         } else {
            var i = ''
         }
         var a = questions[question].answers;
         var t = questions[question].type;
         io.emit('hoster', {q, a, t, i});
         io.emit('player', {q});
      } catch (e) {
         io.emit('finished', {score});
      }
   })

   socket.on('next', () => {
      io.emit('next', {score})
      question += 1;
      answered = 0;
   })

   socket.on('answer', ({name, answer}) => {
      console.log(name, "answered", answer)
      answered += 1
      if (answer === 5) {
         if (questions[question].correct.includes(answer)) {
            let temp = name
            let user = score.find( ({ name }) => name === temp )
            user.score += 5;
            mergeArrayWithObject(score, user)
            score.sort((a, b) => b.score - a.score);
         } else {
            let temp = name
            let user = score.find( ({ name }) => name === temp )
            user.score -= 5;
            mergeArrayWithObject(score, user)
            score.sort((a, b) => b.score - a.score);
            console.log("tricked")
         }
      } else {
         if (questions[question].correct.includes(answer)) {
            let temp = name
            let user = score.find( ({ name }) => name === temp )
            user.score += 1;
            mergeArrayWithObject(score, user)
            score.sort((a, b) => b.score - a.score);
         } else if (questions[question].trick.includes(answer)) {
            let temp = name
            let user = score.find( ({ name }) => name === temp )
            user.score -= 1;
            mergeArrayWithObject(score, user)
            score.sort((a, b) => b.score - a.score);
         }
      }

      if (answered === score.length) {
         console.log(answer, score.length)
         io.emit('next', {score})
         question += 1;
         answered = 0;
      }

   })
});

http.listen(27015, function () {
   console.log('listening on port 27015')
})

// catch 404 and forward to error handler
app.use(function(req, res, next) {
   next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
   // set locals, only providing error in development
   res.locals.message = err.message;
   res.locals.error = req.app.get("env") === "development" ? err : {};

   // render the error page
   res.status(err.status || 500);
   res.render("error");
});

module.exports = app;