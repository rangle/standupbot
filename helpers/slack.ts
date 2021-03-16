import fetch from 'node-fetch';
import Response from 'node-fetch';

const apiBase = 'https://slack.com/api/';
const apiToken = process.env.SLACK_KEY;

const postHeaders = {
    'Content-type': 'application/json; charset=utf-8',
    'User-Agent': 'Mozilla/5.0 (meowbot)',
    'Authorization': `Bearer ${apiToken}`
};

export const getChannel = (channelName: string): Promise<Slack.Channel> => new Promise((resolve: Function, reject: Function) => {
    fetch(`${apiBase}conversations.list?token=${apiToken}&exclude_archived=1&types=private_channel`)
    .then((response: Response) => response.json())
    .then((json: Slack.ChannelListResponse) => {
        if (!json.ok) { reject(json); return; }
        resolve(json.channels.find(channel => channel.name === channelName))
    })
    .catch(error => reject(error));
});

export const getMembers = (channel: Slack.Channel): Promise<string[]> => new Promise((resolve: Function, reject: Function) => {
    fetch(`${apiBase}conversations.members?token=${apiToken}&channel=${channel.id}`)
    .then((response: Response) => response.json())
    .then((json: Slack.MemberListResponse) => {
        if (!json.ok) { reject(json); return; }
        resolve(json.members)
    })
    .catch(error => reject(error));
});

export const getAllUsers = (): Promise<Map<string,Slack.Member>> => new Promise((resolve: Function, reject: Function) => {
    fetch(`${apiBase}users.list?token=${apiToken}`)
    .then((response: Response) => response.json())
    .then((json: Slack.UserListResponse) => {
        if (!json.ok) { reject(json); return; }
        let outMap = new Map<string, Slack.Member>();
        if (json.members) {
            json.members.forEach(u => outMap.set(u.id, u));
        }
        resolve(outMap)
    })
    .catch(error => reject(error));
});

export const getPosters = (channel: Slack.Channel): Promise<Object> => new Promise((resolve: Function, reject: Function) => {
    let today = new Date();
    today.setHours(6);
    today.setMinutes(0);
    let tstamp = today.getTime() / 1000;
    fetch(`${apiBase}conversations.history?token=${apiToken}&channel=${channel.id}&oldest=${tstamp}`)
    .then((response: Response) => response.json())
    .then((json: Slack.MessageListResponse) => {
        if (!json.ok) { reject(json); return; }
        var postUsers = {};
        json.messages.forEach(item => postUsers[item.user] = 1);
        resolve(postUsers);
    })
    .catch(error => reject(error));
});

export const getUserStatus = (uid : string): Promise<string> => new Promise((resolve: Function, reject: Function) => {
    fetch(`${apiBase}users.getPresence?token=${apiToken}&user=${uid}`)
    .then((response: Response) => response.json())
    .then((json: Slack.UserPresenceResponse) => {
        if (!json.ok) { reject(json); return; }
        resolve(json.presence)
    })
    .catch(error => reject(error));
});

const slackPost = (channel: Slack.Channel, content: any): Promise<void> => new Promise((resolve: Function, reject: Function) => {
    content.channel = channel.id;
    fetch(`${apiBase}chat.postMessage`, { method: 'POST', body: JSON.stringify(content), headers: postHeaders })
        .then((response: Response) => response.json())
        //.then(async (response: Response) => { response.ok ? response.json() : console.log(await response.text()) })
        .then((json: any) => { console.log(json); resolve(json) })
        .catch(error => reject(error));
});

export const postMessage = (channel: Slack.Channel, msg: string, attachTitle?: string): Promise<void> => new Promise((resolve: Function, reject: Function) => {
    if (msg === null) {
        reject(new Error("No message to post!"));
        return;
    }
    const message: any = (attachTitle != null) ? {
        "attachments": [
            {
                "color": "#00bf6f",
                "title": attachTitle,
                "text": msg
            }
        ]
    }
        : {
            "text": msg
        };
    message.username = "Monkeybot";
    message.icon_url = "https://i.imgur.com/0rRmtDG.png";

    resolve(slackPost(channel, message));
});


// Slack response typedef below
export declare module Slack {

    export interface Topic {
        value: string;
        creator: string;
        last_set: number;
    }

    export interface Purpose {
        value: string;
        creator: string;
        last_set: number;
    }

    export interface Channel {
        id: string;
        name: string;
        is_channel: boolean;
        is_group: boolean;
        is_im: boolean;
        created: number;
        creator: string;
        is_archived: boolean;
        is_general: boolean;
        unlinked: number;
        name_normalized: string;
        is_shared: boolean;
        is_ext_shared: boolean;
        is_org_shared: boolean;
        pending_shared: any[];
        is_pending_ext_shared: boolean;
        is_member: boolean;
        is_private: boolean;
        is_mpim: boolean;
        topic: Topic;
        purpose: Purpose;
        previous_names: any[];
        num_members: number;
    }

    export interface Profile {
        avatar_hash: string;
        status_text: string;
        status_emoji: string;
        real_name: string;
        display_name: string;
        real_name_normalized: string;
        display_name_normalized: string;
        email: string;
        image_24: string;
        image_32: string;
        image_48: string;
        image_72: string;
        image_192: string;
        image_512: string;
        team: string;
        image_1024: string;
        image_original: string;
        first_name: string;
        last_name: string;
        title: string;
        phone: string;
        skype: string;
    }

    export interface Member {
        id: string;
        team_id: string;
        name: string;
        deleted: boolean;
        color: string;
        real_name: string;
        tz: string;
        tz_label: string;
        tz_offset: number;
        profile: Profile;
        is_admin: boolean;
        is_owner: boolean;
        is_primary_owner: boolean;
        is_restricted: boolean;
        is_ultra_restricted: boolean;
        is_bot: boolean;
        updated: number;
        is_app_user: boolean;
        has_2fa: boolean;
    }


    export interface ResponseMetadata {
        next_cursor: string;
    }

    export interface ChannelListResponse {
        ok: boolean;
        error?: string;
        channels?: Channel[];
        response_metadata: ResponseMetadata;
    }

    export interface MemberListResponse {
        ok: boolean;
        error?: string;
        members?: string[];
        response_metadata: ResponseMetadata;
    }

    export interface UserListResponse {
        ok: boolean;
        error?: string;
        members?: Member[];
        response_metadata: ResponseMetadata;
    }

    export interface Message {
        type: string;
        user: string;
        text: string;
        ts: string;
    }

    export interface MessageListResponse {
        ok: boolean;
        error?: string;
        messages?: Message[];
        has_more?: boolean;
        pin_count?: number;
        response_metadata: ResponseMetadata;
    }

    export interface UserPresenceResponse {
        ok: boolean;
        error?: string;
        presence?: string;
    }

}