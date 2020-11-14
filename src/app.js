require('dotenv').config()
var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cors = require("cors");

var testAPIRouter = require("./routes/testAPI");
var quest = require("./quesitons/warcrimes.json");

var app = express();
var http = require("http").createServer(app);
var io = require("socket.io")(http);

var game = [];
var users = [];
var questions = quest

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
      let temp1 = room
      let lobby = game.find( ({ room }) => room == temp1 )
      let temp = name
      try {
         if (lobby.score.find( ({ name }) => name === temp )) {
            let message = "Name Taken"
            socket.emit('issue', {message})
         } else {
            socket.join(room)
            io.to(room).emit('players', {name})
            lobby.score.push({name: name, score:0, correct:0})
            users.push({name: name, socket:socket, room: room})
         }
      } catch (e) {
         let message = "Room Does Not Exist"
         socket.emit('issue', {message})
      }
   })

   socket.on('rejoin', ({name, room}) => {
      try {
         console.log(name, 'Reconnected')
         socket.join(room)
         let temp = name
         let user = users.find(({name}) => name === temp)
         user.socket = socket
      } catch (e) {
         let message = "Issue Reconnecting to Game"
         socket.emit('issue', {message})
      }
   })

   socket.on('host', () => {
      var room = Math.floor((Math.random() * 9999) + 1);
      console.log('Host Session Started', room)
      socket.join(room)
      io.to(room).emit('host', {room})
      let temp = {room: room, score: [], question:0, answered:0, startRound: new Date(), lastAnswer:0 }
      game.push(temp)
   })

   socket.on('start', () => {
      let currentRoom = (socket.rooms[Object.keys(socket.rooms)[0]])
      let room = game.find( ({ room }) => room == currentRoom )
      room.startRound = new Date();
      try {
         var q = questions[room.question].question;
         if (questions[room.question].type === 2) {
            var i = questions[room.question].img
         } else {
            var i = ''
         }
         var a = questions[room.question].answers;
         var t = questions[room.question].type;
         io.to(currentRoom).emit('hoster', {q, a, t, i});
         io.to(currentRoom).emit('player', {q});
      } catch (e) {
         let score = room.score
         io.to(currentRoom).emit('finished', {score});
      }
   })

   socket.on('closed', () => {
      let currentRoom = (socket.rooms[Object.keys(socket.rooms)[0]])
      let message = "Game Closed"
      io.to(currentRoom).emit('issue', {message})
   })

   socket.on('next', () => {
      let currentRoom = (socket.rooms[Object.keys(socket.rooms)[0]])
      let room = game.find( ({ room }) => room == currentRoom )
      let score = room.score
      let last = room.lastAnswer
      io.to(currentRoom).emit('next', {score, last})
      room.question += 1;
      room.answered = 0;
   })

   socket.on('kicks', ({name}) => {
      console.log("Attempting to kick ", name)
      let currentRoom = (socket.rooms[Object.keys(socket.rooms)[0]])
      let room = game.find( ({ room }) => room == currentRoom )
      let temp2 = name
      let user2 = users.find( ({ name }) => name === temp2 )
      let message = "You have been kicked"
      user2.socket.emit('issue', {message})
      var removeIndex = room.score.map(item => item.name).indexOf(name);
      ~removeIndex && room.score.splice(removeIndex, 1);
   })

   socket.on('answer', ({name, answer}) => {
      console.log(name, "answered", answer)
      let currentRoom = (socket.rooms[Object.keys(socket.rooms)[0]])
      let room = game.find( ({ room }) => room == currentRoom )
      let endRound = new Date();
      let seconds = 0
      let scoreMultiplier = 0
      try {
         seconds = Math.round((endRound - room.startRound) / 1000)
         scoreMultiplier = Math.round(((45-seconds) / 45) * 1000)
      } catch (e) {
         scoreMultiplier = 1000
      }

      let temp = name
      let user = room.score.find( ({ name }) => name === temp )
      user.correct = answer;
      room.lastAnswer = questions[room.question]

      if (answer === 5) {
         if (questions[room.question].correct.includes(answer)) {
            user.score += 5*scoreMultiplier;
         } else {
            user.score -= 5*scoreMultiplier;
         }
      } else {
         if (questions[room.question].correct.includes(answer)) {
            user.score += 1*scoreMultiplier;
         } else if (questions[room.question].trick.includes(answer)) {
            user.score -= 1*scoreMultiplier;
         }
      }

      mergeArrayWithObject(room.score, user)
      room.score.sort((a, b) => b.score - a.score);
      room.answered += 1

      if (room.answered === room.score.length) {
         let score = room.score
         let last = room.lastAnswer
         io.to(currentRoom).emit('next', {score, last})
         room.question += 1;
         room.answered = 0;
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