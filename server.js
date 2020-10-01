const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cors = require('cors')
const mongo = require('mongodb')
const mongoose = require('mongoose')
const User = require('./models/user')
const Exercise = require('./models/exercise')
mongoose.Promise = Promise
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track', { useMongoClient: true })

app.use(cors())

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/exercise/new-user', async (req, res) => {
  const { username } = req.body
  if (!username) {
    res.json({ success: false, message: 'No username provided' })
    return
  }

  User.findOne({ username: username }).exec((err, data) => {
    if (err) {
      console.log(err)
      res.json({ success: false, message: err })
      return
    }

    if (data) {
      res.json({ success: false, message: 'Username is already taken' })
      return
    }

    const user = new User({ username })
    user.save()
    res.json(user)
    return
  })
})

app.post('/api/exercise/add', async (req, res) => {
  const { userId, description, duration, date } = req.body

  if (!userId || !description || !duration || !date) {
    res.json({ success: false, message: 'some data is missing' })
    return
  }

  let validDate = new Date(date)
  if (validDate == 'Invalid Date') {
    res.json({ success: false, message: 'invalid date' })
    return
  }

  const user = await User.findOne({ _id: userId }).exec().catch(err => {
    console.log(err)
    res.json({ success: false, message: 'user not found' })
  })
  if (!user) {
    res.json({ success: false, message: 'user not found' })
    return
  }
  const exercise = new Exercise({ userId, description, duration, date: validDate })
  exercise.save()

  res.json(exercise)
  return
})

app.get('/api/exercise/log', async (req, res) => {

  if (!req.query.userId) {
    res.json({ success: false, message: 'No userId specified' })
    return
  }

  let user = await User.findOne({ _id: req.query.userId }).exec().catch(err => {
    res.json({ success: false, message: 'invalid userid' })
  });

  if (!user) {
    res.json({ success: false, message: 'No user found' })
    return
  }
  let options = {}
  if (req.query.from) {
    options.date = {}
    let fromDate = new Date(req.query.from)
    if (fromDate == 'Invalid Date') {
      res.json({ success: false, message: 'Invalid Date' })
      return
    }
    options['date']['$gte'] = fromDate
    // exercises.where().gte(fromDate)

  }

  if (req.query.to) {
    options.date = {}
    let toDate = new Date(req.query.from)
    if (toDate == 'Invalid Date') {
      res.json({ success: false, message: 'Invalid Date' })
      return
    }
    options['date']['$lte'] = toDate
    // exercises.where().lte(toDate)
  }
  let query = {
     userId: req.query.userId,
     ...options
  }
  const exercises = Exercise.find(query)

  if (req.query.limit) {
    let limit = parseInt(req.query.limit)
    if (limit == 'Invalid Date') {
      res.json({ success: false, message: 'Invalid Date' })
      return
    }
    exercises.limit(limit)
  }
  exercises.exec((err, data) => {
    if (err) {
      console.log(err)
      res.json({success: false, error: err})
      return
    }

    res.json(data)
    return
  })
  
})


// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: 'not found' })
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
