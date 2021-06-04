import { APIGatewayProxyHandler } from 'aws-lambda';
import 'source-map-support/register';
import { getChannel, getMembers, getAllUsers, getPosters, getUserStatus, postMessage, Slack } from "./helpers/slack";

const standupTitle = "<!here> It's virtual standup time!!";
const standupPrompt = "1. What did you accomplish since the last check-in?\n"
+ "2. What are you working on next?\n"
+ "3. Current Status: Blocked :no_entry_sign:, Need Assistance :hand:, On Track :white_check_mark:\n"

export const promptStandup: APIGatewayProxyHandler = async (_, _context) => {
  try {
    let channelName = process.env.SLACK_STANDUP_CHANNEL;
    console.log("standup check in: ", channelName);
    const channel: Slack.Channel = await getChannel(channelName);
    await postMessage(channel, standupPrompt, standupTitle);
    return { statusCode: 200, body: '' };
  } catch (error) {
    console.error("Oh noes!!, promptStandup failed");
    console.log(error);
  }
}

export const checkStandup: APIGatewayProxyHandler = async (_, _context) => {
  try {
    await doStandupCheck(process.env.SLACK_STANDUP_CHANNEL);
    return { statusCode: 200, body: '' };
  } catch (error) {
    console.error("Oh noes!!, checkStandup failed");
    console.log(error);
  }
}

export const listStandupUsers: APIGatewayProxyHandler = async (_, _context) => {
  try {
    let channelName = process.env.SLACK_STANDUP_CHANNEL;
    console.log("list users in: ", channelName);
    const channel: Slack.Channel = await getChannel(channelName);
    let [members, users] = await Promise.all([getMembers(channel), getAllUsers()]);
    
    //console.debug(members);
    //console.debug(users);

    let outMap = new Map<string, string>();
    members.forEach(id => {
      if (users.has(id)) {
        outMap.set(id, users.get(id).name);
      }
    });

    //console.debug(outMap);

    return { statusCode: 200, body: JSON.stringify(outMap) };
  } catch (error) {
    console.error("Oh noes!!, listStandupUsers failed");
    console.log(error);
  }
}

const doStandupCheck = async (channelName: string): Promise<void> => {
  console.log("standup check in: ", channelName);
  const channel: Slack.Channel = await getChannel(channelName);
  let [members, posters] = await Promise.all([getMembers(channel), getPosters(channel)]);
  console.log("channel members: ", members);
  console.log("channel posters: ", posters);

  let usersToPoke = new Map();
  members.forEach(uid => usersToPoke.set(uid, 1) );
  for (let p in posters) {
    usersToPoke.delete(p);
  }


  const ignoredUsers = (process.env.REMOVE_FROM_STANDUP || "").split(',').map(u => u.trim());
  console.debug('Ignored Users', ignoredUsers);
  ignoredUsers.forEach(ignoredUser => {
    usersToPoke.delete(ignoredUser)
  });
  
  // remove inactive users
  let it = usersToPoke.keys();
  let next = it.next();
  while (!next.done) {
    let uid = next.value;
    try {
      let stat = await getUserStatus(uid);
      console.debug("status check", uid, stat);
      if (stat !== "active") {
        usersToPoke.delete(uid);
      }
    } catch (err) {
      // For e.g. other workspaces
      console.debug('could not get info for user', uid, err)
    }
    next = it.next();
  }

  let lePoke = [];
  if (usersToPoke.size > 0) {
    console.log("Poking", usersToPoke);
    usersToPoke.forEach((_, key) => {
      lePoke.push('<@' + key + '>');
    });
    console.log("Poking ", lePoke);
    await postMessage(channel, "Please provide status " + lePoke.join(', '));
  } else {
    console.log("Nobody to poke");
  }
};
