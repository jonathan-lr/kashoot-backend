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
      question: 'By What Name Do The Dragons Refer To The Dragonborn?',
      answers: ['Dragonborn', 'Fafnir', 'Beowulf', 'Dovahkiin'],
      correct: [4],
      trick: [1],
      type: 1,
   },
   {
      question: 'Which Order Of Monks Lives On The Peak Of Skyrim\'s Tallest Mountain?',
      answers: ['Greybeards', 'Dark Brotherhood', 'Mythic Dawn', 'Rain Disciples'],
      correct: [1],
      trick: [0],
      type: 1,
   },
   {
      question: 'Which Craftable Set Of Armour Provides The Most Defence?',
      answers: ['Dragonplate', 'Ebony', 'Daedric', 'Orcish'],
      correct: [3],
      trick: [0],
      type: 1,
   },
   {
      question: 'What Curse Is The Inner Circle Of The Companion\'s Guild Afflicted With?',
      answers: ['Vampirism', 'Lycanthropy', 'Gigantism', 'Zombification'],
      correct: [2],
      trick: [0],
      type: 1,
   },
   {
      question: 'The Falmer Are Feral Descendants Of Which Advanced Race?',
      answers: ['Dwemer', 'Snow Elves', 'Ayleid', 'Chimer'],
      correct: [2],
      trick: [0],
      type: 1,
   },
   {
      question: 'Which Two Belligerents Participated In Skyrim\'s Civil War?',
      answers: ['Akiviri and Kamal', 'Daedra and Aedra', 'Stormcloaks and Imperials', 'Aldmeri Dominion and Greybeards'],
      correct: [3],
      trick: [0],
      type: 1,
   },
   {
      question: 'Which Horse Does Astrid Gift You Upon Joining The Dark Brotherhood?',
      answers: ['Roach', 'Epona', 'Shadowmere', 'Rapidash'],
      correct: [3],
      trick: [1,2,4],
      type: 1,
   },
   {
      question: 'What Are The Draugr?',
      answers: ['Reanimated ancestors of the Dragonborn', 'Corpses possessed by dark magic', 'Victims of hideous experiments', 'Undead Nordic warriors'],
      correct: [4],
      trick: [0],
      type: 1,
   },
   {
      question: 'Who Is Leader Of The Stormcloaks?',
      answers: ['Balgruuf', 'Skald', 'Ulfric', 'Vignar Gray-Mane'],
      correct: [3],
      trick: [0],
      type: 1,
   },
   {
      question: 'What Title Is Given To Rulers Of Skyrim\'s Nine Holds?',
      answers: ['Chancellor', 'Jarl', 'Earl', 'Viscount'],
      correct: [3],
      trick: [0],
      type: 1,
   },
   {
      question: 'Which Prehistoric Animal Is Frequently Seen Accompanying Giants?',
      answers: ['Mammoth', 'Dire wolf', 'Saber-toothed cat', 'Auroch'],
      correct: [1],
      trick: [0],
      type: 1,
   },
   {
      question: 'Which Dragon Was Alduin\'s Lieutenant During The Dragon War?',
      answers: ['Odahviing', 'Nahagliiv', 'Durnehviir', 'Paarthunax'],
      correct: [4],
      trick: [0],
      type: 1,
   },
   {
      question: 'Complete the quote "You see those warriors from Hammerfell?"',
      answers: ['...they\'ve got curved swords. Curved. Swords.', '...with a belly full of mead.', '...lollygaggin\'', '...bad feeling about this'],
      correct: [1],
      trick: [0],
      type: 1,
   },
   {
      question: 'Complete the quote "Sorry lass, I\'ve got important things to do."',
      answers: ['Well, not her. Her corpse. She\'s quite dead.', 'Guard duty.', 'We\'ll speak another time.', 'Let me get some mead!'],
      correct: [3],
      trick: [0],
      type: 1,
   },
   {
      question: 'Complete the quote "This is the part where"',
      answers: ['...somebody stole your sweet roll.', '...you fall down and bleed to death!', '...you call me Sheogorath, Daedric Prince of Madness.', '...I stab you in the back.'],
      correct: [2],
      trick: [0],
      type: 1,
   },
   {
      question: 'Complete the quote "I used to be an adventurer like you"',
      answers: ['...then I took an arrow to the knee', '...rug, cat', '...in these parts for years', '...and I just dont know it yet'],
      correct: [1],
      trick: [2,3,4],
      type: 1,
   },
   {
      question: 'What town/city is this?',
      img: 'https://i.imgur.com/43j7aKZ.png',
      answers: ['Dawnstar', 'Riften', 'Markarth', 'Falkreath'],
      correct: [1],
      trick: [0],
      type: 2,
   },
   {
      question: 'What town/city is this?',
      img: 'https://i.imgur.com/FHOWmz6.png',
      answers: ['Solitude', 'Helgen', 'Morthal', 'Riverwood'],
      correct: [3],
      trick: [0],
      type: 2,
   },
   {
      question: 'What town/city is this?',
      img: 'https://i.imgur.com/UxYHQmf.png',
      answers: ['Whiterun', 'Winterhold', 'Windstad', 'Windhelm'],
      correct: [1],
      trick: [3],
      type: 2,
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