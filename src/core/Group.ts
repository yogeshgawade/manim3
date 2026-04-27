// Group extends Mobject directly — NOT VMobject.
// A container has no bezier points.
import { Mobject } from './Mobject';

export class Group extends Mobject {
  constructor(...mobjects: Mobject[]) {
    super();
    for (const mob of mobjects) this.add(mob);
  }
}
