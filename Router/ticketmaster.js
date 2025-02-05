import express from 'express'
import listEndpoints from 'express-list-endpoints'
import mongoose from 'mongoose'

import Events from '../data/ticketmaster.json'

const Event = require('../models/Event');
const router = express.Router();

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/mongo-db"
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise


if (process.env.RESET_DB) {
  const seedDB = async () => {
    await Event.deleteMany()
    // eslint-disable-next-line no-underscore-dangle
    Events._embedded.events.forEach((item) => {
      const newEvent = new Event(item);
      newEvent.save();
    }) 
  }
  seedDB()
}   

router.get('/', async (req, res) => {
  try {
    res.json(listEndpoints(router))
  } catch (err) {
    res.status(404).send({ error: "Not found" })
  }
})

router.get("/events", async (req, res) => {
  const { country, title, artist } = req.query;
  let resultArr = []
  const queryArr = [] // to store queries
  try {
    if (country) {
      queryArr.push({ '_embedded.venues.country.countryCode': country })
    }
    if (title) {
      // regex for: if the word exists in a string and case insensitive
      queryArr.push({ name: new RegExp(`.*${title}.*`, "gi") }) 
    }
    if (artist) {
      queryArr.push({ '_embedded.attractions.name': new RegExp(`.*${artist}.*`, "gi") })
    }
    // check if there are any stored queries
    if (queryArr.length === 0) {   
      resultArr = await Event.find()
    } else { 
      // filter by stored queries
      resultArr = await Event.find({ $and: [...queryArr] }) 
    }
    return resultArr.length > 0 ? res.json(resultArr) : res.send({ result: "No events found. Try another search" })
  } catch (err) {
    res.status(404).send({ error: "Page not found" })
  }
});
  
router.get('/events/summer21', async (req, res) => {
  try {
    const startDate = new Date("2021-05-01").toISOString()
    const endDate = new Date("2021-09-01").toISOString()
    await Event.find({ "dates.start.dateTime": { $gte: startDate, $lte: endDate } })
      .then((event) => {
        return event ? res.json(event) : res.send({ result: "No events this summer 😞" })
      })
  } catch (err) {
    res.status(404).send({ error: "Page not found" })
  }
})

router.get('/events/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await Event.findById(id)
      .then((event) => {
        return event ? res.json(event) : res.status(404).send({ error: "Invalid id" })
      })
  } catch (err) {
    res.status(404).send({ error: "Page not found" })
  }
})

module.exports = router;