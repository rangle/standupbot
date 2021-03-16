# standupbot

Standupbot is a tool to facilitate virtual standup in a Slack channel. It works by using an EventBridge trigger at specified timings, and executes specialized lambda functions.

![sample functionality in Slack](docs/screenshot.png)

1. The first trigger is to prompt channel members (@here) with a message prompting for status updates.
2. Additional triggers can be set up (e.g. 30 and 50 minutes after the prompt) to ping online channel members who have not recently responded.

The script is currently somewhat hardcoded, in that it can only handle one channel per deployment.

## Pre-Reqs

You'll have to first create a Slack App. I don't remember if this is stricly required or if you could manage with a custom integration, but it does require a certain set of elevated perms to read channel members and their status, so this is one of possibly multiple ways to make it work.

1. Go to https://api.slack.com/apps/
2. Create a new app, select 'Rangle' (or something else) as your dev workspace. This will effectively be your 'forever' workspace because we're not distributing this as a public app.
3. You can set some basic details, whatever's minimally required.
4. You'll need to get an OAuth Token from the "OAuth & Permissions" tab. Copy the bot token, you'll need it in your env file.
5. In OAuth, under "Scopes" you'll need 
  * channels:history (this is needed to find channels by name instead of ID)
  * channels:read
  * chat:write
  * chat:write.customize (this is to alter the name and display picture from the app default, if you care)
  * groups:history (this and the next one is required if your standup channel is private)
  * groups:read
  * users:read (this is needed to see whether a user is online)
5. Create a new channel in Slack for your standups. You'll typically want to use this channel only for standup.
6. You'll need to make sure the app is installed to the workspace after adding those perms - there should be a green button for this next to the Bot OAuth Token.

## Install the serverless framework

```bash
# optionally configure your AWS CLT
aws configure
npm install -g serverless
```

## Create the env file

Per the serverless framework, you can have a `dev.env.json` and `prod.env.json` (and others). Dev will run by default.

```json
{
    "SLACK_STANDUP_CHANNEL": "my_test_channel",
    "SLACK_STANDUP_CHANNEL_PROD": "myproject_standup",
    "SLACK_KEY": "xoxb-1234-12341234"
}
```
The first channel is used by the `prompt-standup` and `check-standup` functions.
The "PROD" channel is used by the `list-standup-users` method (more on this later). It should be identical to the main channel in your `prod` env config.
The Slack key is the OAuth Bot token you copied earlier.

## Deploy & Test

Test locally by using e.g. `sls invoke local -f prompt-standup`, where the last arg is the name of the function you want to execute in serverless.yml.

Deploy to AWS by using e.g. `sls deploy --aws-profile personal --stage prod` (profile is optional, if you've set that up).

## Configure Timing

You'll find the timing for each trigger in the serverless.yml file. You can have the check+poke run as many times as you like, but note that the `getPosters()` method in `helpers/slack.ts` checks for people who have said something in the channel since 6am GMT (roughly midnight, Eastern). There's a small chance that this leads to weird results if you have a project in time zones on the other side of the planet.

Note also that the AWS cron syntax is annoyingly different from the real cron syntax that's been around for 45 years... plus, it appears to always work in GMT so you may have to update the timing for daylight savings twice a year.

## Users to ignore

By default, the standup check will look to poke all members of the channel. One last "configurable" thing is the ability to ignore certain channel members - it's actually hardcoded for now because it was a late addition I didn't get to cleaning up. You'll see this in the `doStandupCheck` function in `handle-standupbot.ts`, specifically removing UIDs from an array. To find those IDs in your channel, use `sls invoke local -f list-standup-users` locally, which references the `SLACK_STANDUP_CHANNEL_PROD`. It's a bit hacky, but I wanted to avoid forcing `--stage prod` to scan the right channel. Then you can look for the IDs you want to exclude and update the script, then redeploy.