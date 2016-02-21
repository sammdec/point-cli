#!/usr/bin/env node
'use strict'

/*
 * Dependencies
 */
const vorpal = require('vorpal')()
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
let devices = {}
const conf = new Configstore(pkg.name)
const apiURL = 'https://api.minut.com/draft1'
const req = axios.create({
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
  .catch(function (res) {
    console.log(chalk.yellow(res.data.message))
  })
}

function checkAuth () {
  if (conf.get('token')) {
    return true
  } else {
    console.log(chalk.yellow(`You don't have an access token yet! Run ${chalk.underline('point auth')} to get started.`));
  }
}

function getDevice (args) {
  let devices = conf.get('devices')
  let deviceName = args.device || Object.keys(devices)[0]
  let deviceID = devices[deviceName]
  return { name: deviceName, id: deviceID }
}

function formatDate (date) {
  return dateFormat(date, 'HH:MM dd/mm/yyyy')
}

/*
 * Commands
 */

/**
  * Get current version
  */
vorpal
  .command('version')
  .description('Gets current version')
  .action(function (args, cb) {
    this.log(`point-cli v${pkg.version}`)
  })

/**
  * Generate access token
  *
  * @param {string} clientID - User's unique client ID.
  * @param {string} Username - Email Address used to login to Point account.
  * @param {string} Password - Password used to login to Point account.
  */
vorpal
  .command('auth')
  .description('Authenticates user & generates access token.')
  .action(function (args, cb) {
    co(function *() {
      var clientID = yield prompt('Client ID: ')
      var username = yield prompt('Username: ')
      var password = yield prompt.password('Password: ')
      auth(clientID, username, password)
    })
  })

/**
  * Lists Devices
  *
  * @param {string} clientID - User's unique client ID.
  * @param {string} Username - Email Address used to login to Point account.
  * @param {string} Password - Password used to login to Point account.
  * @return {Array.<string>} - Device Name and ID
  */
vorpal
  .command('devices')
  .description('Gets all Points of user.')
  .option('-v, --verbose', 'Gets verbose details for devices')
  .validate(checkAuth)
  .action(function (args, cb) {
    req.get('/devices')
    .then(function (res) {
      for (var device of res.data.devices) {
        devices[device.description] = device.device_id

        console.log(chalk.blue('Name: ') + device.description)
        console.log(chalk.blue('ID: ') + device.device_id)
        if (args.options.verbose) {
          console.log(chalk.blue('Online: ') + (!device.offline ? '✔' : '✗'))
          console.log(chalk.blue('Active: ') + (device.active ? '✔' : '✗'))
          console.log(chalk.blue('Last seen: ') + formatDate(device.last_heard_from_at))
        }
        console.log('\n')
      }
      conf.set('devices', devices)
    })
  })

/**
  * Get Temperature
  *
  * @param {string} Device - Name of device
  * @return {string} - Most recent temp in celsius and the timestamp
  */
vorpal
  .command('temp [device]')
  .description('Gets the temperature (°C) of a Point (defaults to the first Point found)')
  .validate(function () {
    return
  })
  .action(function (args, cb) {
    let device = getDevice(args)

    console.log(chalk.blue('Point: ') + device.name)

    req.get(`/devices/${device.id}/temperature`)
    .then(function (res) {
      let newest = _.last(res.data.values)
      console.log(chalk.blue('Temp: ') + `${_.round(newest.value, 2)}°C`)
      console.log(chalk.blue('Time: ') + formatDate(newest.datetime))
    })
  })

/**
  * Get Humidity
  *
  * @param {string} Device - Name of device
  * @return {string} - Most recent humidity in percentage and the timestamp
  */
vorpal
  .command('humidity [device]')
  .description('Gets the humidity (%) from a Point (defaults to the first Point found)')
  .validate(checkAuth)
  .action(function (args, cb) {
    let device = getDevice(args)
    console.log(chalk.blue('Point: ') + device.name)
    req.get(`/devices/${device.id}/humidity`)
    .then(function (res) {
      let newest = _.last(res.data.values)
      console.log(chalk.blue('Humidity: ') + `${newest.value}%`)
      console.log(chalk.blue('Time: ') + formatDate(newest.datetime))
    })
  })

/**
  * Get Sound level
  *
  * @param {string} Device - Name of device
  * @return {string} - Most recent sound in db and the timestamp
  */
vorpal
  .command('sound [device]')
  .alias('noise')
  .description('Gets the average sound level (db) from a Point (defaults to the first Point found)')
  .validate(checkAuth)
  .action(function (args, cb) {
    let device = getDevice(args)
    console.log(chalk.blue('Point: ') + device.name)
    req.get(`/devices/${device.id}/sound_avg_levels`)
    .then(function (res) {
      let newest = _.last(res.data.values)
      console.log(chalk.blue('Avg sound: ') + `${newest.value}%`)
      console.log(chalk.blue('Time: ') + formatDate(newest.datetime))
    })
  })

/**
  * Get the timeline
  *
  * @param {string} event - Number of events you wish to retrieve
  * @return {string} - All the recorded events from your points timeline
  */
vorpal
  .command('timeline')
  .description('Retrieve your homes timeline (defaults to 10 events)')
  .option('-e, --events', 'Specify how many events you would like to retrieve')
  .validate(checkAuth)
  .action(function (args, cb) {
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

      console.log(chalk.green('↓ Past'))
      for (var event of newTimeline) {
        console.log(chalk.yellow('↓'))
        console.log(chalk.blue('↓ Date: ') + formatDate(event.datetime))
        console.log(chalk.blue('↓ Event: ') + event.type)
      }
      console.log(chalk.green('→ Present'))
    })
  })

vorpal.find('exit').remove()

// Kick stuff off
vorpal.parse(process.argv)
