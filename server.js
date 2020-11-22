// init project
const express = require("express")
const app = express()
const Twilio = require("twilio")
const MessagingResponse = require('twilio').twiml.MessagingResponse
const fs = require('fs')
const GraphemeSplitter = require("grapheme-splitter")
const figlet = require('figlet')

var splitter = new GraphemeSplitter()

var translations = JSON.parse(fs.readFileSync('translations.json', 'utf8'))
var translationsArray = Object.values(translations)

function translate(text, alphabet) {
  const _a = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
  var translated = ''
  var key
  
  if(alphabet==='random') {
    key = translationsArray[Math.floor(Math.random() * translationsArray.length)]
  } else if(alphabet==='all') {
    var all = ''
    for(var i = 0; i < Object.keys(translations).length; i++) {
      all += translate(text, Object.keys(translations)[i]) + '\n'
    }
    return all
  } else { 
    console.log(`Using alphabet "${alphabet}"`)
    key = translations[alphabet]
  }
  
  var graphemes = splitter.splitGraphemes(key)
  
  for(var i=0; i<text.length; i++) {
    if(_a.indexOf(text[i]) < 0) {
      translated += text[i]
    } else {
      translated += graphemes[_a.indexOf(text[i])]
    }
  }

  console.log(`${text} into ${translated}`)
  
  return translated
}

function transformText(text) {
  return translate(text.trimLeft().trimRight(), 'all')
}

// setup form and post handling
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
// serve static files
app.use(express.static("public"));
// log requests
app.use(function (req, res, next) {
  console.log(req.method, req.url)
  next()
})

app.get("/", function(req, res) {
  // show the setup page if the env isn't configured
  if (process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_PHONE_NUMBER &&
      process.env.YOUR_PHONE_NUMBER &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.SECRET) {
    res.sendFile(__dirname + "/views/index.html")
  } else {
    res.redirect('/setup')
  }
})

// code for the setup flow
app.get("/setup", function(req, res) {
  res.sendFile(__dirname + "/views/setup.html")
})

app.get("/setup-status", function (req, res) {
  res.json({
    "your-phone": !!process.env.YOUR_PHONE_NUMBER,
    "secret": !!process.env.SECRET,
    "credentials": !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    "twilio-phone": !!process.env.TWILIO_PHONE_NUMBER
  })
})

// example code
app.post("/sms", function(req, res) {
  // check for secret
  if (!req.body.secret || req.body.secret !== process.env.SECRET) {
    res.status(403)
    res.end('incorrect secret!')
    return
  }

  // setup twilio client
  const client = new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

  // Create options to send the message
  const options = {
    to: process.env.YOUR_PHONE_NUMBER,
    from: process.env.TWILIO_PHONE_NUMBER,
    body: req.body.message || 'Hi, this is Nicholas\' bot!'
  }

  // Send the message!
  client.messages.create(options, function(err, response) {
    if (err) {
      console.error(err);
      res.end('oh no, there was an error! Check the app logs for more information.')
    } else {
      console.log('success!')
      res.end('successfully sent your message! check your device')
    }
  })
})

app.post('/sms_response', (req, res) => {
  // Twilio Messaging URL - receives incoming messages from Twilio
  const response = new MessagingResponse()

  console.log(`${req.body.From}`)

  if(req.body.Body.length > 20) {
    // With 32 translations, this will be larger than the 1600 character limit that Twilio has on responses
    // Let's actually keep it lower than 20 to save on messaging costs. 
    var message = 'Please keep your message to less than 20 characters and just use plain text (A-Z, a-z).'
  } else {
    var message = transformText(req.body.Body)
  }
  response.message(message)


  res.set('Content-Type', 'text/xml')
  res.send(response.toString())
});


app.post("/mms", function(req, res) {
   if (!req.body.secret || req.body.secret !== process.env.SECRET) {
    res.status(403)
    res.end('incorrect secret!')
    return
  }

  const client = new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

  // Create options to send the message
  const options = {
    to: process.env.YOUR_PHONE_NUMBER,
    from: process.env.TWILIO_PHONE_NUMBER,
    mediaUrl: [req.body.media || 'https://demo.twilio.com/owl.png'],
    body: req.body.message || 'hoot!'
  }

  // Send the message!
  client.messages.create(options, function(err, response) {
    if (err) {
      console.error(err)
      res.end('oh no, there was an error! Check the app logs for more information.')
    } else {
      console.log('success!')
      res.end('successfully sent your message! check your device')
    }
  })
})

// listen for requests :)
const listener = app.listen(process.env.PORT, function() {
  console.log("Your app is listening on port " + listener.address().port)
})
