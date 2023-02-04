import { idgenerator } from '../../../utils/utils';
import { TanaIntermediateFile, TanaIntermediateNode, TanaIntermediateSummary } from '../../../types/types';

export function createField(name: string, value: string | string[]): TanaIntermediateNode {
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

export function createMentionsField(node: TanaIntermediateNode | TanaIntermediateNode[]): TanaIntermediateNode {
  return {
    uid: idgenerator(),
    name: 'Mentions',
    createdAt: new Date().getTime(),
    editedAt: new Date().getTime(),
    type: 'field',
    children: Array.isArray(node) ? node : [node],
  };
}

export function createMediaField(name: string, value: string | string[]): TanaIntermediateNode {
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
