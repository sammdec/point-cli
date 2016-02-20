# point-cli
> Check on your home from the command line with [Point](https://minut.com/)

## Install

```
$ npm install -g point-cli
```

## Usage

First off send a nice email to marcus@minut.com to get your `client_id` & `client_secret`. Once you have these you can login:

```
point auth

Client ID: <client_id>
Username: <username for your point account>
Password: <password for your Point account>
```

**Note: Your username & password are never stored, they are only sent to Point retrieve an access key, this is then stored on your computer at `~/.config/configstore/point-cli.json`**

#### Devices
This will fetch all the Point devices you own

```
point devices

Name: Living Room
ID: 83984398hfjjf90j0j
```

#### Temperature
This will fetch all the Point devices you own

```
point temp <device name>

Point: Living Room
Temp: 24.125°C
Time: 16:49 13/01/2016
```

## TODO
- [ ] Use stored devices as autocomplete suggestions
- [ ] Version command
- [ ] Remove `exit` command
- [ ] Keep up to date with new api versions
