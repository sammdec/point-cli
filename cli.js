#!/usr/bin/env node --harmony
'use strict'

/*
 * Dependencies
 */
const cmd = require('commander')
const Configstore = require('configstore')
const pkg = require('./package.json')
const chalk = require('chalk')
const axios = require('axios')
const dateFormat = require('dateFormat')
const co = require('co')
const prompt = require('co-prompt')
const _ = require('lodash')

/*
 * Constants
 */
const conf = new Configstore(pkg.name)
const apiURL = 'https://api.minut.com/draft1'
let req = axios.create({
  baseURL: apiURL,
  headers: {'Authorization': `Bearer ${conf.get('token')}`}
})

/*
 * Methods
 */
function auth (client_id, username, password) {
  var config = {
    baseURL: apiURL,
    params: {
      client_id: client_id,
      grant_type: 'password',
      username: username,
      password: password
    }
  }

  axios.get('/auth/token', config)
  .then(function (res) {
    conf.set('token', res.data.access_token)
    console.log(chalk.green('Access token generated and saved!'))
  })
  .then(function() {
    fetchDevices()
  })
  .catch(function (res) {
    console.log(chalk.yellow(res.data.message))
  })
}

function fetchDevices () {
  let config = {
    baseURL: apiURL,
    headers: {'Authorization': `Bearer ${conf.get('token')}`}
  }

  console.log(chalk.green('Fetching Points...'))

  axios.get('/devices', config)
    .then(function (res) {
      console.log(`Found ${res.data.devices.length} Point`)
      let allDevices = _.map(res.data.devices, function (n) {
        console.log(`Name: ${n.description}`)
        return {id: n.device_id, name: n.description}
      })
      conf.set('devices', allDevices)
    })
    .catch(function (res) {
      console.log(chalk.red(res.data.message))
    })
}

function checkAuth (args) {
  if (conf.get('token')) {
    return true
  } else {
    console.log(chalk.yellow(`You don't have an access token yet! Run ${chalk.underline('point auth')} to get started.`))
    process.exit(1)
  }
}

function getDevice (deviceName) {
  let devices = conf.get('devices')
  return _.find(devices, ['name', deviceName]) || _.first(devices)
}

function formatDate (date) {
  return dateFormat(date, 'HH:MM dd/mm/yyyy')
}

function timelinePrettier(s) {
  let prettyString = _.chain(s)
                      .replace(/:/g, ' ')
                      .startCase()
                      .value()
  return prettyString
}

/*
 * Commands
 */

/**
  * Get current version
  */
cmd.version(pkg.version)

/**
  * Generate access token
  *
  * @param {string} clientID - User's unique client ID.
  * @param {string} Username - Email Address used to login to Point account.
  * @param {string} Password - Password used to login to Point account.
  */
cmd
  .command('auth')
  .description('Authenticates user & generates access token.')
  .action(function (args, opts) {
    co(function *() {
      var clientID = yield prompt('Client ID: ')
      var username = yield prompt('Username: ')
      var password = yield prompt.password('Password: ')
      auth(clientID, username, password)
    })
  })

cmd
  .command('logout')
  .description('Logs out of point-cli by deleting the stored api key and devices')
  .action(function () {
    conf.clear()
  })

/**
  * Fetches Devices
  *
  * @return {Array.<string>} - Device Name and ID
  */
cmd
  .command('fetch')
  .description('Fetch new devices that have been installed')
  .action(function () {
    checkAuth()

    fetchDevices()
  })

/**
  * Lists Devices
  *
  * @param {string} clientID - User's unique client ID.
  * @param {string} Username - Email Address used to login to Point account.
  * @param {string} Password - Password used to login to Point account.
  * @return {Array.<string>} - Device Name and ID
  */
cmd
  .command('devices')
  .description('Gets all Points of user.')
  .option('-v, --verbose', 'Gets verbose details for devices')
  .action(function (verbose, opts) {
    checkAuth()

    req.get('/devices')
      .then(function (res) {
        for (var device of res.data.devices) {
          console.log('Name: ' + chalk.blue(device.description))
          console.log('ID: ' + chalk.blue(device.device_id))
          if (verbose) {
            console.log('Online: ' + chalk.blue(!device.offline ? '✔' : '✗'))
            console.log('Active: ' + chalk.blue(device.active ? '✔' : '✗'))
            console.log('Last seen: ' + chalk.blue(formatDate(device.last_heard_from_at)))
          }
          if (res.data.devices > 1) {console.log('\n')}
        }
      })
  })

/**
  * Get Temperature
  *
  * @param {string} Device - Name of device
  * @return {string} - Most recent temp in celsius and the timestamp
  */
cmd
  .command('temp [device]')
  .description('Gets the temperature (°C) of a Point (defaults to the first Point found)')
  .action(function (device, options) {
    checkAuth()

    let point = getDevice(device)
    console.log('Point: ' + chalk.blue(point.name))

    req.get(`/devices/${point.id}/temperature`)
      .then(function (res) {
        let newest = _.last(res.data.values)
        console.log('Temp: ' + chalk.blue(`${_.round(newest.value, 2)}°C`))
        console.log('Time: ' + chalk.blue(formatDate(newest.datetime)))
      })
  })

/**
  * Get Humidity
  *
  * @param {string} Device - Name of device
  * @return {string} - Most recent humidity in percentage and the timestamp
  */
cmd
  .command('humidity [device]')
  .description('Gets the humidity (%) from a Point (defaults to the first Point found)')
  .action(function (device, opts) {
    checkAuth()

    let point = getDevice(device)
    console.log('Point: ' + chalk.blue(point.name))

    req.get(`/devices/${point.id}/humidity`)
      .then(function (res) {
        let newest = _.last(res.data.values)
        console.log('Humidity: ' + chalk.blue(`${newest.value}%`))
        console.log('Time: ' + chalk.blue(formatDate(newest.datetime)))
      })
  })

/**
  * Get Sound level
  *
  * @param {string} Device - Name of device
  * @return {string} - Most recent sound in db and the timestamp
  */
cmd
  .command('sound [device]')
  .alias('noise')
  .description('Gets the average sound level (db) from a Point (defaults to the first Point found)')
  .action(function (device, opts) {
    checkAuth()

    let point = getDevice(device)
    console.log('Point: ' + chalk.blue(point.name))

    req.get(`/devices/${point.id}/sound_avg_levels`)
      .then(function (res) {
        let newest = _.last(res.data.values)
        console.log('Avg sound: ' + chalk.blue(`${newest.value}%`))
        console.log('Time: ' + chalk.blue(formatDate(newest.datetime)))
      })
  })

/**
  * Get the timeline
  *
  * @param {string} event - Number of events you wish to retrieve
  * @return {string} - All the recorded events from your points timeline
  */
cmd
  .command('timeline')
  .description('Retrieve your homes timeline (defaults to 10 events)')
  .option('-e, --events', 'Specify how many events you would like to retrieve')
  .action(function (args, opts) {
    checkAuth()

    var config = {
      params: {
        limit: 200
      }
    }
    req.get('/timelines/me', config)
      .then(function (res) {
        let timeline = res.data.events
        let newTimelineLength = args.options.events || 10
        let newTimeline = timeline.slice(-newTimelineLength)

        console.log(chalk.green('→ Past'))
        for (var event of newTimeline) {
          console.log(chalk.green('↓'))
          console.log('Date: ' + chalk.blue(formatDate(event.datetime)))
          console.log('Event: ' + chalk.blue(timelinePrettier(event.type)))
        }
        console.log(chalk.green('→ Present'))
      })
  })

// Kick stuff off
cmd.parse(process.argv)
