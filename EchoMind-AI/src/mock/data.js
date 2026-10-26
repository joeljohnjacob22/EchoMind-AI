export const people = [
  { id: 1, name: 'Anna', relation: 'Daughter', photo: '/src/mock/anna.svg', count: 24 },
  { id: 2, name: 'Ravi', relation: 'Son', photo: '/src/mock/ravi.svg', count: 12 },
]

export const places = [
  { id: 'munnar', name: 'Munnar', label: 'Munnar, Kerala' },
  { id: 'home', name: 'Home', label: 'Family House' },
]

export const memories = [
  {
    id: 'm1',
    title: 'Family Trip to Munnar',
    date: 'June 2022',
    location: 'Munnar, Kerala',
    people: [1,2],
    favorite: true,
    type: 'photo',
    thumbnail: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80',
    description: 'These photos were taken during a family trip to Munnar. You visited the tea gardens and spent time with your family.'
  },
  {
    id: 'm2',
    title: 'Birthday at Home',
    date: 'March 2021',
    location: 'Home',
    people: [1],
    favorite: false,
    type: 'photo',
    thumbnail: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1200&q=80',
    description: 'A small family birthday celebration at home.'
  },
  {
    id: 'm3',
    title: 'Garden Morning',
    date: 'April 2023',
    location: 'Garden',
    people: [1,2],
    favorite: true,
    type: 'photo',
    thumbnail: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=1200&q=80',
    description: 'A calm morning in the garden, filled with sunlight and laughter.'
  },
  {
    id: 'm4',
    title: 'Family Dinner',
    date: 'December 2020',
    location: 'Dining Room',
    people: [1,2],
    favorite: false,
    type: 'photo',
    thumbnail: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=80',
    description: 'A warm dinner together, captured in one of the happiest evenings of the year.'
  }
]

export function mockAIAnswer(question) {
  // simple simulated AI responses
  const q = question.toLowerCase()
  if (q.includes('who is')) return 'This is Anna, your daughter.'
  if (q.includes('where')) return 'This photo was taken in Munnar, Kerala.'
  if (q.includes('2022')) return 'Showing memories from 2022.'
  return 'I can help: try asking "Who is this?" or "Where was this taken?"'
}
