# point-cli [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)
> Check on your home from the command line with [Point](https://minut.com/)

## Install

```
$ npm install -g point-cli
```

## Usage

First off send a nice email to marcus@minut.com to get your `client_id` & `client_secret`. Once you have these you can login:

```
$ point auth

Client ID: <client_id>
Username: <username for your Point account>
Password: <password for your Point account>
```

**Note: Your username & password are never stored, they are only sent to Point retrieve an access key, this is then stored on your computer at `~/.config/configstore/point-cli.json`**

#### List Devices
This will fetch all the Point devices you own

```
$ point devices

  Options
    -v | --v   Gets verbose details for devices

Name: Living Room
ID: 83984398hfjjf90j0j

or

$ point devices --verbose

Name: Living Room
ID: 83984398hfjjf90j0j
Online: ✔
Active: ✔
Last seen: 18:43 24/02/2016
```


#### Get Temperature
This will fetch the temperature for the Point device specified or the first one found

```
$ point temp <device name>

Point: Living Room
Temp: 23.25°C
Time: 18:42 24/02/2016
```


#### Get Humidity
This will fetch the humidity for the Point device specified or the first one found

```
$ point humidity <device name>

Point: Living Room
Humidity: 50%
Time: 18:42 24/02/2016
```


#### Get average sound levels
This will fetch the average sound level for the Point device specified or the first one found

```
$ point sound <device name>
or
$ point noise <device name>

Point: Living Room
Avg sound: 54
Time: 18:42 24/02/2016
```

#### Get your timeline
This will fetch timeline for all your Points

```
$ point timeline

→ Past
↓
Date: 08:47 19/02/2016
Event: Home Humidity High
↓
Date: 20:32 22/02/2016
Event: Home Humidity High
↓
Date: 22:35 22/02/2016
Event: Device Button Short Press
...
→ Present
```

## License
MIT License (MIT)
Copyright (c) 2016 Sam Mason
