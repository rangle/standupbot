import { APIGatewayProxyHandler } from 'aws-lambda';
import 'source-map-support/register';
import { getChannel, getMembers, getAllUsers, getPosters, getUserStatus, postMessage, Slack } from "./helpers/slack";

const standupTitle = "<!here> It's virtual standup time!!";
const standupPrompt = "- What do you plan to do today?\n"
+ "- Are you blocked or needing clarification on anything?\n"
+ "- Need a second pair of eyes?\n"
+ "- Any new discoveries to share?\n"
+ "If you prefer, feel free to contact Jason, Michael or each other if you think your conundrum runs deeper than a slack message can solve.";

export const promptStandup: APIGatewayProxyHandler = async (event: CustomEvent, _context) => {
  try {
    let channelName = process.env.SLACK_STANDUP_CHANNEL;
    console.log("standup check in: ", channelName);
    const channel: Slack.Channel = await getChannel(channelName);
    await postMessage(channel, standupPrompt, standupTitle);
    return { statusCode: 200, body: '' };
  } catch (error) {
    console.error("Oh noes!!");
    console.log(error);
  }
}

export const checkStandup: APIGatewayProxyHandler = async (event: CustomEvent, _context) => {
  try {
    await doStandupCheck(process.env.SLACK_STANDUP_CHANNEL);
    return { statusCode: 200, body: '' };
  } catch (error) {
    console.error("Oh noes!!");
    console.log(error);
  }
}

export const listStandupUsers: APIGatewayProxyHandler = async (event: CustomEvent, _context) => {
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
    console.error("Oh noes!!");
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
  usersToPoke.delete('UPFFSMC3S'); // always remove Rick
  usersToPoke.delete('UMVBDKAK1'); // always remove Sanya
  usersToPoke.delete('U7WKT9ZFZ'); // always remove Jason
  
  // remove inactive users
  let it = usersToPoke.keys();
  let next = it.next();
  while (!next.done) {
    let uid = next.value;
    let stat = await getUserStatus(uid);
    console.debug("status check", uid, stat);
    if (stat !== "active") { usersToPoke.delete(uid); }
    next = it.next();
  }

  let lePoke = [];
  if (usersToPoke.size > 0) {
    console.log("Poking", usersToPoke);
    usersToPoke.forEach((val,key) => lePoke.push('<@'+key+'>'));
    console.log("Poking ", lePoke);
    await postMessage(channel, "Please provide status " + lePoke.join(', '));
  } else {
    console.log("Nobody to poke");
  }
};
