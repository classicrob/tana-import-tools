import { type } from 'os';
import { arrayBuffer } from 'stream/consumers';
import { TanaIntermediateFile, TanaIntermediateNode, TanaIntermediateSummary } from '../../types/types';
import { idgenerator } from '../../utils/utils';
import { createField, createMentionsField, createMediaField, createFieldFromNodes } from './nodeCreators/createField';
import * as fs from 'fs';
interface Tweet {
  tweet: {
    full_text: string;
    created_at: string;
    id_str: string;
    favorite_count: string;
    in_reply_to_status_id_str?: string;
    entities: {
      hashtags: [];
      symbols: [];
      user_mentions: [
        // there may be more than one user mentioned. How to handle this?
        {
          name: string;
          screen_name: string;
          id_str: string;
        },
      ];
      urls: [];
      media?: [
        {
          media_url: string;
          media_url_https: string;
        },
      ];
    };
  };
}

interface TwitterUser {
  name: string;
  screen_name: string;
  id_str: string;
}

// write a function that creates an array of all of the people in tweets.json as twitterUser objects
function createPeopleArray(tweets: Tweet[]): TwitterUser[] {
  return tweets.flatMap((tweet) => tweet.tweet.entities.user_mentions);
}

function convertTwitterDate(date: string): string {
  const dateObject = new Date(date);
  const month = (dateObject.getMonth() + 1).toString().padStart(2, '0');
  const day = dateObject.getDate().toString().padStart(2, '0');
  const year = dateObject.getFullYear();
  return `${month}-${day}-${year}`;
}

function createDateNode(date: string): TanaIntermediateNode {
  return {
    uid: convertTwitterDate(date),
    name: convertTwitterDate(date),
    type: 'date',
    createdAt: new Date(date).getTime(),
    editedAt: new Date(date).getTime(),
  };
}

function createMediaNode(media_url: string): TanaIntermediateNode {
  return {
    uid: idgenerator(),
    name: 'tweet image',
    createdAt: new Date().getTime(),
    editedAt: new Date().getTime(),
    type: 'image',
    mediaUrl: media_url,
  };
}

// create a function that creates Tana Intermediate Nodes for all people mentioned, and then puts in refs to them in the field value.

function createPersonNode(person: TwitterUser): TanaIntermediateNode {
  return {
    uid: person.id_str,
    name: person.screen_name,
    createdAt: new Date().getTime(),
    editedAt: new Date().getTime(),
    type: 'node',
    children: [createField('Name', person.name), createField('user id', person.id_str)],
    supertags: ['Twitter User'],
  };
}

// This function checks if a tweet has entities.urls.expanded_url
// that starts with "https://twitter.com/RobertHaisfield/status/".
// If it does, return the array of tweet ids that match the condition.
// If not, return undefined.
// This function is looking for Robert Haisfield's quote tweets of himself.

function extractQuoteTweetID(tweet: Tweet): string[] {
  const urls = tweet.tweet.entities.urls;
  const quoteTweets = urls
    .filter((url: { expanded_url: string }) =>
      url.expanded_url.startsWith('https://twitter.com/RobertHaisfield/status/'),
    )
    .map((url: { expanded_url: string }) => url.expanded_url.split('/').slice(-1)[0].split('?')[0]);
  return quoteTweets;
}

// convert an array of arrays into a single array

// take quoteTweets and make sure that each string only

// function splitOutTheQuestionMarks(qtArray: string[]): string[] {
//  return qtArray.flatMap((qt) => qt.split('?'));
// }

// function qtsIWant(tweet: Tweet): string[] | undefined {
//   splitOutTheQuestionMarks(findQuoteTweet(tweet));
// }
let json: Tweet[];
// query the JSON file for the tweet with the id_str that matches the quote tweet id_str. Return that tweet interface.
// Could take the parsed json object as a parameter, or could read the file in here.
function findMatchingTweet(tweetID: string): Tweet | undefined {
  const matchingTweet = json.find((tweet: Tweet) => tweet.tweet.id_str === tweetID);
  return matchingTweet;
}

function createTweetNode(tweet: Tweet): TanaIntermediateNode {
  const tweetTime = new Date(tweet.tweet.created_at).getTime();
  return {
    uid: tweet.tweet.id_str,
    name: tweet.tweet.full_text,
    createdAt: tweetTime,
    editedAt: tweetTime,
    type: 'node',
    supertags: ['Rob Tweets'],
    children: [
      {
        uid: idgenerator(),
        name: 'Author',
        createdAt: tweetTime,
        editedAt: tweetTime,
        type: 'field',
        children: [
          {
            uid: 'RobHaisfield',
            name: 'Rob Haisfield', //how do I ensure that it only creates and references one Rob Haisfield node?
            createdAt: tweetTime,
            editedAt: tweetTime,
            type: 'node',
          },
        ],
      },
      // How do I insert the person nodes here?
      ...(tweet.tweet.entities.user_mentions
        ? [createMentionsField(tweet.tweet.entities.user_mentions.map(createPersonNode))]
        : []),
      // If there is a quote tweet, create a quote tweet field and put it in the children array
      // write the above function with a ternary operator
      // ...(findQuoteTweet(tweet)
      //   ? [createFieldFromNodes('QTs', [createTweetNode(findMatchingTweet(findQuoteTweet(tweet)))])]
      //   : []),
      // I think I need to rewrite the above to work in the case of a tweet with multiple quote tweets
      ...(extractQuoteTweetID(tweet)
        ? [
            createFieldFromNodes(
              'QTs',
              extractQuoteTweetID(tweet).map((x: string) => createTweetNode(findMatchingTweet(x)!)),
            ),
          ]
        : []),

      // To do: if there is a media url, create a media field and put it in the children array
      ...(tweet.tweet.entities.media
        ? [
            createMediaField(
              tweet.tweet.entities.media.map((media: { media_url_https: string }) => media.media_url_https),
            ),
          ]
        : []),

      {
        uid: idgenerator(),
        name: 'Date',
        createdAt: tweetTime,
        editedAt: tweetTime,
        type: 'field',
        children: [createDateNode(tweet.tweet.created_at)],
      },
      createField('Tweet URL', `https://twitter.com/RobertHaisfield/status/${tweet.tweet.id_str}`),
    ],
  };
}

// createTweetNode(findMatchingTweet("1325798636186296320"))

// TODO add to createTweetNode function to create a quote tweet field

export class TwitterConverter {
  // returns a triple with version, summary, and nodes
  // name of the function, 0 or more arguments with their types, then the return type.
  // The bar undefined means it's a union of the TanaIntermediateFile and undefined. Could return either.
  convert(fileContent: string): TanaIntermediateFile | undefined {
    json = JSON.parse(fileContent);
    //trying to make a map
    const attributes = [
      {
        name: 'Author',
        values: ['[[Rob Haisfield]]'],
        count: 1,
      },
      {
        name: 'Date',
        values: [],
        count: 1,
      },
      {
        name: 'Mentions',
        values: [],
        count: 1,
      },
      {
        name: 'Media',
        values: [],
        count: 1,
      },
      {
        name: 'Tweet URL',
        values: [],
        count: 1,
      },
      {
        name: 'Name',
        values: [],
        count: 1,
      },
      {
        name: 'user id',
        values: [],
        count: 1,
      },
      {
        name: 'QTs',
        values: [],
        count: 1,
      },
    ];
    const supertags = [
      {
        uid: 'Rob Tweets',
        name: 'Rob Tweets',
      },
      {
        uid: 'Twitter User',
        name: 'Twitter User',
      },
    ];
    const arrayOfUsers = createPeopleArray(json.slice(0, 2000));
    const personArray = arrayOfUsers.map(createPersonNode);

    const tweetNodes = json.slice(0, 2000).map(createTweetNode);
    // console.log(
    //   json.slice(0, 300).forEach((tweet: Tweet) => {
    //     return findQuoteTweet(tweet);
    //   }),
    // );

    console.log(
      json
        .slice(0, 300)
        .map(extractQuoteTweetID)
        .flat()
        .filter((el: string | undefined) => typeof el === 'string'),
    );

    const quoteTweets = json
      .slice(0, 300)
      .map(extractQuoteTweetID)
      .flat()
      .filter((el: string | undefined) => typeof el === 'string');

    console.log(quoteTweets);
    console.log(findMatchingTweet('1325798636186296320'));
    console.log(createTweetNode(findMatchingTweet('1325798636186296320')!));

    // Map takes a function reference, and applies it to each element in the array.
    // If I called the function, then the outcome of that function is what's used.
    // const nodes = json.map((tweetObject: Tweet) => createTweetNode(tweetObject));
    // this is passing an anonymous lambda function, equivalent to above
    // rootLevelNodes are the first nodes in any thread. Date is in a field, not on day node.

    const nodes = personArray.concat(tweetNodes);
    const summary: TanaIntermediateSummary = {
      leafNodes: 0,
      topLevelNodes: nodes.length,
      totalNodes: 0,
      calendarNodes: 0,
      fields: 0,
      brokenRefs: 0,
    };
    // json.map(createPerson);
    return {
      version: 'TanaIntermediateFile V0.1',
      summary,
      nodes,
      attributes,
      supertags,
    };
  }
}

// write a function to convert "Wed Nov 09 18:59:31 +0000 2022", into a MM-DD-YYYY format string
