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
    thumbnail: '/src/mock/munnar1.svg',
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
    thumbnail: '/src/mock/bday.svg',
    description: 'A small family birthday celebration at home.'
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
