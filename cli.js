#!/usr/bin/env node
'use strict';

/*
 * Dependencies
 */
const vorpal = require('vorpal')();
const Configstore = require('configstore');
const pkg = require('./package.json');
const chalk = require('chalk');
const axios = require('axios');
const moment = require('moment');
const co = require('co');
const prompt = require('co-prompt');



/*
 * Constants
 */
let devices = {};
const conf = new Configstore(pkg.name);
const apiURL = 'https://api.minut.com/draft1';
const req = axios.create({
  baseURL: apiURL,
  headers: {'Authorization': `Bearer ${conf.get('token')}`}
})

/*
 * Test Details
 */
 // client_id: c33c3776f220cd90
 // username: live1@minut.com
 // password: superhero1

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


function checkAuth() {
  if (!conf.get('token')) {
    console.log(chalk.yellow(`You don't have an access token yet! Run ${chalk.underline('pnt auth')} to get started.`))
  }
}

function getDevice(args) {
  let devices = conf.get('devices');
  let deviceName = args.device || Object.keys(devices)[0];
  let deviceID = devices[deviceName];
  return { name: deviceName, id: deviceID };
}

function formatDate(date) {
  return moment(date).format('HH:mm DD/MM/YYYY');
}

/*
 * Commands
 */

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
    if(!checkAuth) {
      co(function *() {
        var clientID = yield prompt('Client ID: ');
        var username = yield prompt('Username: ');
        var password = yield prompt.password('Password: ');
        auth(clientID, username, password);
      });
    }
  });



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
  .action(function(args, cb){
    req.get('/devices')
    .then(function (res) {
      for (var device of res.data.devices) {
        devices[device.description] = device.device_id;

        console.log(chalk.green('Name: ') + device.description);
        console.log(chalk.green('ID: ') + device.device_id);
        if (args.options.verbose) {
          console.log(chalk.green('Offline: ') + device.offline)
          console.log(chalk.green('Active: ') + device.active)
          console.log(chalk.green('Last seen: ') + formatDate(device.last_heard_from_at))
        }
        console.log('\n')
      }
      conf.set('devices', devices);
    });
  });



vorpal
  .command('temp [device]')
  .description('Gets the temperature (°C) of a Point (defaults to the first Point found)')
  .option('-n', '--number', '')
  .action(function (args, cb) {
    let device = getDevice(args);
    console.log(chalk.green('Point: ') + device.name)
    req.get(`/devices/${device.id}/temperature`)
    .then(function (res) {
      console.log(`${res.data.values[0]}°C`)
    });
  });

vorpal
  .command('humidity [device]')
  .description('Gets the humidity (%) from a Point (defaults to the first Point found)')
  .option('-n', '--number', '')
  .action(function (args, cb) {
    let device = getDevice(args);
    console.log(chalk.green('Point: ') + device.name)
    req.get(`/devices/${device.id}/humidity`)
    .then(function (res) {
      console.log(`${res.data.values[0]}%`)
    });
  });





vorpal
  .command('sound [device]')
  .description('Gets the average sound level (db) from a Point (defaults to the first Point found)')
  .option('-n', '--number', '')
  .action(function (args, cb) {
    let device = getDevice(args);
    console.log(chalk.green('Point: ') + device.name)
    req.get(`/devices/${device.id}/sound_avg_levels`)
    .then(function (res) {
      console.log(`${res.data.values[0]}db`)
    });
  });


vorpal
  .command('timeline')
  .action(function (args, cb) {
    var config = {
      params: {
        limit: args.options.limit || 10
      }
    }
    req.get('/timelines/me', config)
    .then(function (res) {
      for (var event of res.data.events) {
        console.log(chalk.green('Date: ') + formatDate(event.datetime))
        console.log(chalk.green('Event: ') + event.type)
        console.log(chalk.blue('||'))
        console.log(chalk.blue('\\/'))
      }
      console.log(chalk.green('NOW'))
    });
  });


  vorpal
    .parse(process.argv);
