import { type } from 'os';
import { arrayBuffer } from 'stream/consumers';
import { TanaIntermediateFile, TanaIntermediateNode, TanaIntermediateSummary } from '../../types/types';
import { idgenerator } from '../../utils/utils';
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
      media?: {
        media_url: string;
      };
    };
  };
}

interface twitterUser {
  name: string;
  screen_name: string;
  id_str: string;
}

// write a function that creates an array of all of the people in tweets.json as twitterUser objects
function createPeopleArray(tweets: Tweet[]): twitterUser[] {
  let peopleArray: twitterUser[] = [];
  tweets.forEach((tweet) => {
    tweet.tweet.entities.user_mentions.forEach((user) => {
      peopleArray.push(user);
    });
  });
  return peopleArray;
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
function createField(name: string, value: string | string[]): TanaIntermediateNode {
  // Array.isArray is a built in function that returns true if the value is an array
  // if it is an array, take the value as is. If not, make it an array with one element.
  // Ask if I really need to handle things in separate branches or if I can coerce into the same format
  const valueArray = Array.isArray(value) ? value : [value];
  return {
    uid: idgenerator(),
    name: name,
    createdAt: new Date().getTime(),
    editedAt: new Date().getTime(),
    type: 'field',
    //map value array into an array of nodes
    children: valueArray.map((value) => {
      return {
        uid: idgenerator(),
        name: value,
        createdAt: new Date().getTime(),
        editedAt: new Date().getTime(),
        type: 'node',
      };
    }),
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

function createMediaField(name: string, value: string | string[]): TanaIntermediateNode {
  const valueArray = Array.isArray(value) ? value : [value];
  return {
    uid: idgenerator(),
    name: name,
    createdAt: new Date().getTime(),
    editedAt: new Date().getTime(),
    type: 'field',
    //map value array into an array of nodes
    children: valueArray.map((value) => {
      return {
        uid: idgenerator(),
        name: 'image',
        createdAt: new Date().getTime(),
        editedAt: new Date().getTime(),
        type: 'image',
        mediaUrl: value,
      };
    }),
  };
}

function createPerson(tweet: Tweet): TanaIntermediateNode {
  const person = tweet.tweet.entities?.user_mentions[0];
  return {
    uid: person.id_str,
    name: person.name,
    createdAt: new Date().getTime(),
    editedAt: new Date().getTime(),
    type: 'node',
    children: [createField('screen name', person.screen_name), createField('user id', person.id_str)],
  };
}

function createPersonNode(person: twitterUser): TanaIntermediateNode {
  return {
    uid: person.id_str,
    name: person.name,
    createdAt: new Date().getTime(),
    editedAt: new Date().getTime(),
    type: 'node',
    children: [createField('screen name', person.screen_name), createField('user id', person.id_str)],
  };
}

function createTweetNode(tweet: Tweet): TanaIntermediateNode {
  const tweetTime = new Date(tweet.tweet.created_at).getTime();
  return {
    uid: idgenerator(),
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
      createField(
        'People Mentioned',
        tweet.tweet.entities.user_mentions.map((user) => user.name),
      ),
      ...(tweet.tweet.entities.media?.media_url
        ? [createMediaField('Media', tweet.tweet.entities.media.media_url)]
        : []),
      {
        uid: idgenerator(),
        name: 'Date',
        createdAt: tweetTime,
        editedAt: tweetTime,
        type: 'field',
        children: [createDateNode(tweet.tweet.created_at)],
      },
    ],
  };
}

export class TwitterConverter {
  // returns a triple with version, summary, and nodes
  // name of the function, 0 or more arguments with their types, then the return type.
  // The bar undefined means it's a union of the TanaIntermediateFile and undefined. Could return either.
  convert(fileContent: string): TanaIntermediateFile | undefined {
    const json = JSON.parse(fileContent);
    const summary: TanaIntermediateSummary = {
      leafNodes: 0,
      topLevelNodes: json.length,
      totalNodes: 0,
      calendarNodes: 0,
      fields: 0,
      brokenRefs: 0,
    };
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
    ];
    const tweetNodes = json.map(createTweetNode);
    // Map takes a function reference, and applies it to each element in the array. If I called the function, then the outcome of that function is what's used.
    // const nodes = json.map((tweetObject: Tweet) => createTweetNode(tweetObject)); this is passing an anonymous lambda function, equivalent to above
    // rootLevelNodes are the first nodes in any thread. Date is in a field, not on day node.

    const arrayOfUsers = createPeopleArray(json);
    const personArray = arrayOfUsers.map(createPersonNode);
    const nodes = tweetNodes.concat(personArray);

    json.map(createPerson);
    return {
      version: 'TanaIntermediateFile V0.1',
      summary,
      nodes,
      attributes,
    };
  }
}

// write a function to convert "Wed Nov 09 18:59:31 +0000 2022", into a MM-DD-YYYY format string
