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
      hashtags: [ ],
      symbols: [ ],
      user_mentions: [
        {
          name: string;
          screen_name: "colmobrogain",
          id_str: "32342718",
          id: "32342718"
        }
      ],
      urls: [ ]
    },
    in_reply_to_status_id_str: string;
  }
}
function convertTwitterDate(date: string): string {
  const dateObject = new Date(date);
  const month = (dateObject.getMonth() + 1).toString().padStart(2, '0');
  const day = dateObject.getDate().toString().padStart(2, '0');
  const year = dateObject.getFullYear();
  return `${month}-${day}-${year}`;
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
    brokenRefs: 0,}
    //trying to make a map
    const nodes = json.map((tweetObject: Tweet) => {
      return (
        {uid: idgenerator(),
        name: tweetObject.tweet.full_text,
        createdAt: new Date (tweetObject.tweet.created_at).getTime(),
        editedAt: new Date (tweetObject.tweet.created_at).getTime(),
        type: "node",
        children: [{
          uid: idgenerator(),
          name: "Date",
          createdAt: 0,
          editedAt: 0,
          type: "field",
          children: [{
            uid: idgenerator(),
            name: convertTwitterDate(tweetObject.tweet.created_at),
            createdAt: 0,
            editedAt: 0,
            type: "date",
          }]
        }]
      })
    })
// rootLevelNodes are the first nodes in any thread. Date is in a field, not on day node.

    return {
      version: 'TanaIntermediateFile V0.1',
      summary,
      nodes,
    };
  }
}

// write a function to convert "Wed Nov 09 18:59:31 +0000 2022", into a MM-DD-YYYY format string