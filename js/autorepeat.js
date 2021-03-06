import { CondensedIupac, Sugar, Repeat, Reaction } from 'glycan.js';

const Iupac = CondensedIupac.IO;

const IupacSugar = Iupac(Sugar);

const REPEAT_PATTERNS = {
  TYPEI : 'GlcNAc(b1-3)Gal(b1-3)*',
  TYPEII: 'GlcNAc(b1-3)Gal(b1-4)*',
  HEPARAN: 'GlcA(b1-4)GlcNAc(a1-4)*',
  CHONDROITIN: 'GlcA(b1-3)GalNAc(b1-4)*',
  MATRIGLYCAN: 'GlcA(b1-3)Xyl(a1-3)*',
  POLYSIA: 'NeuAc(a2-8)*'
};

for (let key of Object.keys(REPEAT_PATTERNS)) {
  let seq = REPEAT_PATTERNS[key];
  REPEAT_PATTERNS[key] = new IupacSugar();
  REPEAT_PATTERNS[key].sequence = seq;
  REPEAT_PATTERNS[key].title = key;
}

const repeat_pattern = Symbol('pattern');

const changed = (sugar) => {
  const patterns = Object.values(REPEAT_PATTERNS);
  for (let pattern of patterns) {
    let matches = sugar.match_sugar_pattern(pattern, Reaction.Comparator);
    while (matches.length > 0) {
      let match = matches.shift();
      let root = match.root.children[0].original;
      let leaf = match.leaves()[0].original;
      if ((root instanceof Repeat.Monosaccharide) || (leaf instanceof Repeat.Monosaccharide)) {
        continue;
      }
      if (root.parent && (root.parent instanceof Repeat.Monosaccharide) && pattern.sequence.indexOf(root.parent.repeat.template.sequence) === 0 ) {
        let repeat = root.parent.repeat;
        root.parent.removeChild(root.parent.linkageOf(root),root);
        repeat.max = parseInt(repeat.max)+1;
        repeat.identifier = ''+repeat.max;
        continue;
      }
      let repeat = Repeat.addToSugar(sugar,root,leaf,Repeat.MODE_EXPAND,1,1);
      repeat[repeat_pattern] = pattern;
      repeat.identifier = ''+repeat.max;
      matches = sugar.match_sugar_pattern(pattern, Reaction.Comparator);
    }
  }
  for (let repeat of sugar.repeats) {
    if ( ! repeat[repeat_pattern] ) {
      for (let pattern of patterns) {
        if (pattern.sequence.indexOf(repeat.template.sequence) === 0) {
          repeat[repeat_pattern] = pattern;
        }
      }
    }
  }
};

export default changed;

class ModifiableRepeat {
  constructor(repeat,viewer) {
    this.repeat = repeat;
    this.viewer = viewer;
  }
  set number(n=1) {
    this.repeat.max = n;
    this.repeat.identifier = ''+this.repeat.max;
    this.viewer.fullRefresh();
    this.viewer.sequence = this.viewer.renderer.sugars[0].sequence;
  }

  get number() {
    return this.repeat.max;
  }

  get type() {
    return this.repeat[repeat_pattern] ? this.repeat[repeat_pattern].title : 'NA';
  }

  get expanded() {
    return this.repeat.mode === Repeat.MODE_EXPAND;
  }

  set expanded(value) {
    if (value) {
      this.expand();
    } else {
      this.collapse();
    }
  }

  get collapsed() {
    return ! this.expanded;
  }

  set collapsed(value) {
    this.expanded = ! value;
  }

  toggleExpanded() {
    this.expanded = ! this.expanded;
  }

  expand() {
    if (this.repeat.mode !== Repeat.MODE_EXPAND) {
      this.repeat.mode = Repeat.MODE_EXPAND;
      this.viewer.fullRefresh();
      this.viewer.sequence = this.viewer.renderer.sugars[0].sequence;
    }
  }

  collapse() {
    if (this.repeat.mode !== Repeat.MODE_MINIMAL) {
      this.repeat.mode = Repeat.MODE_MINIMAL;
      this.viewer.fullRefresh();
      this.viewer.sequence = this.viewer.renderer.sugars[0].sequence;
    }
  }

}

export { ModifiableRepeat };