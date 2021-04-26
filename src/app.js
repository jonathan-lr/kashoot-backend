require('dotenv').config()
var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cors = require("cors");
var mysql = require('mysql');

var testAPIRouter = require("./routes/testAPI");
var quest = require("./quesitons/pirate.json");

var app = express();
var http = require("http").createServer(app);
var io = require("socket.io")(http);

var game = [];
var questions = quest

var con = mysql.createConnection({
   host: "localhost",
   user: "kashoot",
   password: "kashoot",
   database : "kashoot"
});

con.connect(function(err) {
   if (err) throw err;
   console.log("Connected!");
});

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(cors(/*{origin: 'https://example.com'}*/));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.use("/", testAPIRouter);

async function updateUser(score, pScore, cScore, answer, room, name, lobby, streak, correct, first, last, minus, wrong) {
   let results = await con.query("UPDATE kashoot.lobby SET score = '"+score+"', answer = '"+answer+"', pScore = '"+pScore+"', cScore = '"+cScore+"', streak = '"+streak+"', correct = '"+correct+"', firstN = '"+first+"', lastN = '"+last+"', minus = '"+minus+"', wrong = '"+wrong+"' WHERE lobby.roomcode = '"+room+"' AND lobby.username = '"+name+"';")
   lobby.answered += 1;
   return results
}

async function resetUsers(room) {
   let results = await con.query("UPDATE kashoot.lobby SET answer = 0 WHERE lobby.roomcode = '"+room+"';")
   return results
}


io.on('connection', function(socket){
   socket.on('join', ({name, room}) => {
      let temp1 = room
      let lobby = game.find( ({ room }) => room == temp1 )
      if (lobby) {
         console.log(name, "Joining", room)
         try {
            con.query("SELECT * FROM kashoot.lobby WHERE lobby.username = '"+ name +"' AND lobby.roomcode = '"+ room +"';", function( error, results) {
               if (error) console.log("ERROR:",error);
               if (results[0]) {
                  console.log(name, "Exists in Room", room)
                  let message = "Name Taken"
                  socket.emit('issue', {message})
               } else {
                  console.log(name, "Joined", room)
                  con.query("INSERT INTO kashoot.lobby (`roomcode`, `username`) VALUES ('"+room+"', '"+name+"');", function (error, results) {
                     if (error) console.log("ERROR:",error);
                  });
                  socket.join(room)
                  io.to(room).emit('players', {name})
                  lobby.players += 1
               }
            });
         } catch (e) {
            console.log(name, "Failed To Join", room)
            let message = "Error Joining Game"
            socket.emit('issue', {message})
         }
      } else {
         let message = "Room Not Found"
         socket.emit('issue', {message})
      }
   })

   socket.on('rejoin', ({name, room}) => {
      let temp1 = room
      let lobby = game.find( ({ room }) => room == temp1 )
      if (lobby) {
         con.query("SELECT * FROM kashoot.lobby WHERE lobby.username = '" + name + "' AND lobby.roomcode = '" + room + "';", function (error, results) {
            if (error) console.log("ERROR:", error);
            if (results[0]) {
               console.log(name, "Reconnected To", room)
               socket.join(room)
            } else {
               console.log(name, "Failed Reconnecting To", room)
               let message = "Issue Reconnecting to Game"
               socket.emit('issue', {message})
            }
         });
      } else {
         console.log(name, "Tried To Connect To Dead Room")
         let message = "Room Is Closed"
         socket.emit('issue', {message})
      }
   })

   socket.on('host', () => {
      var room = Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000;
      console.log('Host Session Started', room)
      socket.join(room)
      io.to(room).emit('host', {room})
      let temp = {room: room, question:0, answered:0, players:0, startRound: new Date() }
      game.push(temp)
   })

   socket.on('start', ({room}) => {
      let temp = room
      let lobby = game.find( ({ room }) => room == temp )
      lobby.startRound = new Date();
      try {
         var q = questions[lobby.question].question;
         if (questions[lobby.question].type === 2 || questions[lobby.question].type === 3) {
            var i = questions[lobby.question].img
         } else {
            var i = ''
         }
         var a = questions[lobby.question].answers;
         var t = questions[lobby.question].type;
         var w = questions[lobby.question].alert;
         io.to(room).emit('hoster', {q, a, t, i, w});
         io.to(room).emit('player', {q});
      } catch (e) {
         con.query("SELECT * FROM kashoot.lobby WHERE lobby.roomcode = '"+ room +"' ORDER BY lobby.score DESC;", function( error, results) {
            if (error) console.log("ERROR:", error);
            if (results) {
               let score = results
               io.to(room).emit('finished', {score});
            }
         });
      }
   })

   socket.on('closed', () => {
      let currentRoom = (socket.rooms[Object.keys(socket.rooms)[0]])
      let message = "Game Closed"
      io.to(currentRoom).emit('issue', {message})
   })

   socket.on('next', ({room}) => {
      let temp = room
      let lobby = game.find( ({ room }) => room == temp )
      let last = questions[lobby.question]
      con.query("SELECT * FROM kashoot.lobby WHERE lobby.roomcode = '"+ room +"' ORDER BY lobby.score DESC;", function( error, results) {
         if (error) console.log("ERROR:", error);
         if (results) {
            let score = results
            io.to(room).emit('next', {score, last})
         }
      });
      lobby.question += 1;
      lobby.answered = 0
      resetUsers(room).then()
   })

   socket.on('kicks', ({name, room}) => {
      console.log("Attempting to kick ", name, "From", room)
      let temp1 = room
      let lobby = game.find( ({ room }) => room == temp1 )
      lobby.players -= 1
      con.query("DELETE FROM kashoot.lobby WHERE lobby.username = '"+name+"' AND lobby.roomcode = '"+room+"';", function (error, results) {
         let message = "You have been kicked"
         io.to(room).emit('issue', {message, name})
      });
   })

   socket.on('answer', ({name, answer, room}) => {
      try {
         console.log(name, "answered", answer)
         let temp = room
         let lobby = game.find(({room}) => room == temp)
         let endRound = new Date();
         let seconds = 0
         let scoreMultiplier = 0
         try {
            seconds = Math.round((endRound - lobby.startRound) / 1000)
            scoreMultiplier = Math.round(((45 - seconds) / 45) * 1000)
         } catch (e) {
            scoreMultiplier = 1000
         }

         con.query("SELECT * FROM kashoot.lobby WHERE lobby.roomcode = '"+ room +"' AND lobby.username = '"+name+"';", function( error, results) {
            if (error) console.log("ERROR:", error);
            if (results[0]) {
               let score = results[0].score
               let pScore = results[0].score
               let streak = results[0].streak
               let correct = results[0].correct
               let first = results[0].firstN
               let last = results[0].lastN
               let minus = results[0].minus
               let wrong = results[0].wrong
               if (lobby.answered === 0) {
                  first += 1
               }
               if (lobby.answered === (lobby.players - 1)) {
                  last += 1
               }
               if (answer === 5) {
                  if (questions[lobby.question].correct.includes(answer)) {
                     score += 5000;
                     correct += 1
                     streak += 1
                  } else {
                     score -= 3000;
                     streak = 0;
                     minus += 3000;
                     wrong += 1;
                  }
               } else {
                  if (questions[lobby.question].correct.includes(answer)) {
                     score += 1 * scoreMultiplier;
                     correct += 1
                     streak += 1
                  } else if (questions[lobby.question].trick.includes(answer)) {
                     score -= 1000;
                     streak = 0
                     minus += 1000;
                     wrong += 1;
                  } else {
                     streak = 0
                     wrong += 1;
                  }
               }
               let cScore = score - pScore;
               updateUser(score, pScore, cScore, answer, room, name, lobby, streak, correct, first, last, minus, wrong).then(results => {
                  console.log("ANSWERED :",lobby.answered, "PLAYERS :", lobby.players)
                  if (lobby.answered === lobby.players) {
                     let last = questions[lobby.question]
                     con.query("SELECT * FROM kashoot.lobby WHERE lobby.roomcode = '"+ room +"' ORDER BY lobby.score DESC;", function( error, results) {
                        if (error) console.log("ERROR:", error);
                        if (results) {
                           let score = results
                           io.to(room).emit('next', {score, last})
                        }
                     });
                     lobby.question += 1;
                     lobby.answered = 0;
                     resetUsers(room).then()
                  }
               });
            }
         });

      } catch (e) {
         console.log("Whoops")
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