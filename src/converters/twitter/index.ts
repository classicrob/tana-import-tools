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
    };
    in_reply_to_status_id_str: string;
  };
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
function createField(name: string, value: string | string [])
{
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
    children: //map value array into an array of nodes
      valueArray.map((value) => {
        return {
          uid: idgenerator(),
          name: value,
          createdAt: new Date().getTime(),
          editedAt: new Date().getTime(),
          type: 'node',
        };
      }),
  };

function createTweetNode(tweet: Tweet): TanaIntermediateNode {
  const tweetTime = new Date(tweet.tweet.created_at).getTime();
  return {
    uid: idgenerator(),
    name: tweet.tweet.full_text,
    createdAt: tweetTime,
    editedAt: tweetTime,
    type: 'node',
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
    const nodes = json.map(createTweetNode);
    // Map takes a function reference, and applies it to each element in the array. If I called the function, then the outcome of that function is what's used.
    // const nodes = json.map((tweetObject: Tweet) => createTweetNode(tweetObject)); this is passing an anonymous lambda function, equivalent to above
    // rootLevelNodes are the first nodes in any thread. Date is in a field, not on day node.

    return {
      version: 'TanaIntermediateFile V0.1',
      summary,
      nodes,
      attributes,
    };
  }
}

// write a function to convert "Wed Nov 09 18:59:31 +0000 2022", into a MM-DD-YYYY format string
