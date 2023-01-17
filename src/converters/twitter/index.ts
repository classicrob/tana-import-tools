import { TanaIntermediateFile, TanaIntermediateNode, TanaIntermediateSummary } from '../../types/types';
import { idgenerator } from '../../utils/utils';

export type Sub = {
  text: string;
  subs?: Sub[];
  _complete?: boolean;
};

export class TwitterConverter {
  private nodesForImport: Map<string, TanaIntermediateNode> = new Map();

  private summary: TanaIntermediateSummary = {
    leafNodes: 0,
    topLevelNodes: 0,
    totalNodes: 0,
    calendarNodes: 0,
    fields: 0,
    brokenRefs: 0,
  };

  convert(fileContent: string): TanaIntermediateFile | undefined {
    let subs: Sub[] = [];

    const rootLevelNodes = [];
    for (const sub of subs) {
      rootLevelNodes.push(this.createTanaNode(sub));
    }

    return {
      version: 'TanaIntermediateFile V0.1',
      summary: this.summary,
      nodes: [...rootLevelNodes],
    };
  }

  private createTanaNode(sub: Sub): TanaIntermediateNode {
    const nodeForImport: TanaIntermediateNode = {
      uid: idgenerator(),
      name: sub.text,
      children: [],
      createdAt: new Date().getTime(),
      editedAt: new Date().getTime(),
      type: 'node',
      todoState: sub._complete ? 'done' : undefined,
    };

    this.nodesForImport.set(nodeForImport.uid, nodeForImport);
    this.summary.totalNodes += 1;

    if (sub.subs) {
      nodeForImport.children = sub.subs.map((s) => this.createTanaNode(s));
    } else {
      this.summary.leafNodes += 1;
    }
    return nodeForImport;
  }
}
