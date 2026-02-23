const adjectives = [
  'Swift',
  'Bright',
  'Clever',
  'Dynamic',
  'Eager',
  'Focused',
  'Gentle',
  'Happy',
  'Inventive',
  'Jolly',
  'Keen',
  'Lively',
  'Mighty',
  'Noble',
  'Optimal',
  'Peaceful',
  'Quick',
  'Radiant',
  'Smart',
  'Tranquil',
  'Unique',
  'Vibrant',
  'Wise',
  'Zealous',
];

const nouns = [
  'Agent',
  'Builder',
  'Coder',
  'Developer',
  'Explorer',
  'Forge',
  'Garden',
  'Helper',
  'Innovator',
  'Journey',
  'Kernel',
  'Lighthouse',
  'Mission',
  'Navigator',
  'Oracle',
  'Project',
  'Quest',
  'Runner',
  'Spark',
  'Task',
  'Unicorn',
  'Voyage',
  'Workshop',
];

export function generateRandomSessionName(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 100);
  return `${adjective} ${noun} ${number}`;
}
