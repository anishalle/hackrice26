// Conversations, as distinct from check-ins. A check-in is Axl asking on a
// schedule and measuring the answer; a chat is the person starting something,
// usually a task they want run.
export const CHATS = [
  {
    id: 'c1',
    title: 'Appeal for the second chair',
    when: 'Today',
    snippet: 'Axl drafted the appeal from the denial letter and your notes. Waiting on your read.',
    open: true,
  },
  {
    id: 'c2',
    title: 'Ride to clinic Thursday',
    when: 'Today',
    snippet: 'Booked, lift confirmed. Driver re-books itself if they cancel.',
  },
  {
    id: 'c3',
    title: 'Which phrases to bank next',
    when: 'Yesterday',
    snippet: 'Everyday lines first. 140 added from this week’s audio.',
  },
  {
    id: 'c4',
    title: 'Mugs I can still hold',
    when: 'Mar 8',
    snippet: 'Two handles and a lid. Swapped into the standing grocery order.',
  },
  {
    id: 'c5',
    title: 'Night shifts with Mom',
    when: 'Mar 4',
    snippet: 'Split by block, not by alarm. Roster asks the second person itself.',
  },
];

// What Axl puts forward in the sidebar, and why. The reason matters more than
// the ranking: a suggestion someone cannot connect to their own week is one
// they scroll past.
export const SUGGESTIONS = [
  { id: 'clinic-brief', why: 'Your clinic visit is in nine days' },
  { id: 'read-aloud', why: 'Your rate dropped 6 this week' },
  { id: 'care-roster', why: 'Elena woke 4× on Tuesday' },
];
