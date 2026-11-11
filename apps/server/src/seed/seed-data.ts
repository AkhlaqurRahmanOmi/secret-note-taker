import { Role } from '../users/role.enum';

/**
 * Demo data; test values only. Interests overlap with different group sizes, and Omar has
 * none. Ethan, Omar and the admin have no posts.
 */

export const ADMIN_PASSWORD = 'admin-demo-pass';
export const USER_PASSWORD = 'user-demo-pass';

export interface SeedUser {
  name: string;
  email: string;
  password: string;
  role: Role;
  interests: string[];
}

/** A note or post, owned by email. */
export interface SeedEntry {
  owner: string;
  title: string;
  content: string;
}

const user = (name: string, interests: string[]): SeedUser => ({
  name,
  email: `${name.split(' ')[0].toLowerCase()}@example.com`,
  password: USER_PASSWORD,
  role: Role.User,
  interests,
});

export const SEED_USERS: SeedUser[] = [
  { name: 'Ada Admin', email: 'admin@example.com', password: ADMIN_PASSWORD, role: Role.Admin, interests: ['coding', 'reading'] },
  user('Maya Chen', ['chess', 'music', 'photography']),
  user('Liam Okafor', ['chess', 'hiking', 'coding']),
  user('Sofia Rossi', ['music', 'cooking', 'travel']),
  user('Noah Patel', ['chess', 'coding', 'gaming']),
  user('Ava Johansson', ['hiking', 'photography', 'travel']),
  user('Ethan Kim', ['music', 'gaming']),
  user('Zara Ahmed', ['chess', 'reading', 'cooking']),
  user('Lucas Silva', ['hiking', 'music', 'travel']),
  user('Mia Novak', ['chess', 'reading', 'photography']),
  user('Omar Haddad', []),
];

const at = (first: string) => `${first}@example.com`;

/** Interleaved so newest-first mixes owners. */
export const SEED_NOTES: SeedEntry[] = [
  { owner: at('maya'), title: 'Openings to study', content: 'Caro-Kann main line, then the Exchange variation. Review the Fantasy variation traps.' },
  { owner: at('liam'), title: 'Trail checklist', content: 'Headlamp, two litres of water, rain shell, first-aid kit, offline map of the ridge route.' },
  { owner: at('sofia'), title: 'Risotto ratios', content: '1 cup arborio to about 4 cups warm stock. Toast the rice first; add stock one ladle at a time.' },
  { owner: at('noah'), title: 'Side project ideas', content: 'CLI for tracking chess puzzles; a tiny static site generator; a habit tracker with no account.' },
  { owner: at('ava'), title: 'Camera settings for dusk', content: 'f/2.8, ISO 800, 1/60s. Bracket three stops. Shoot RAW.' },
  { owner: at('maya'), title: 'Practice plan', content: 'Mon: tactics. Wed: endgames. Fri: one long classical game, then review it the next day.' },
  { owner: at('zara'), title: 'Reading list', content: 'The Remains of the Day; Piranesi; A Psalm for the Wild-Built.' },
  { owner: at('admin'), title: 'Admin runbook', content: 'Rotate JWT_SECRET quarterly. Review new admin accounts monthly.' },
  { owner: at('ethan'), title: 'Setlist draft', content: 'Open with something mid-tempo, the ballad third, finish with the loud one.' },
  { owner: at('lucas'), title: 'Packing for Lisbon', content: 'Adapters, light jacket, comfortable shoes for the hills.' },
  { owner: at('maya'), title: 'Photo walk spots', content: 'Old harbour at sunrise; the market on Saturday; the rooftop garden.' },
  { owner: at('mia'), title: 'Book club questions', content: 'Is the narrator reliable? What does the house stand for?' },
  { owner: at('liam'), title: 'Refactor notes', content: 'Split the parser from the evaluator. Add tests for the edge cases first.' },
  { owner: at('sofia'), title: 'Itinerary, week one', content: 'Florence three nights, Siena day trip, then the coast.' },
  { owner: at('noah'), title: 'Game backlog', content: 'Finish the puzzle one before starting anything open-world.' },
  { owner: at('zara'), title: 'Spice blend', content: 'Toasted cumin, coriander, a little cinnamon, chilli to taste.' },
  { owner: at('maya'), title: 'Piano: next pieces', content: 'Satie Gymnopedie No. 1, then the Chopin nocturne in E minor.' },
  { owner: at('ava'), title: 'Lens wishlist', content: 'A fast 35mm for street, a used 70-200 for wildlife.' },
  { owner: at('liam'), title: 'Hiking log', content: 'North ridge: 14 km, 900 m climb, 5h10. Windy at the top.' },
  { owner: at('ethan'), title: 'Gear to sell', content: 'Old pedalboard, the spare amp, the unused capo collection.' },
  { owner: at('sofia'), title: 'Dinner party menu', content: 'Burrata starter, risotto, lemon tart. Ask about allergies.' },
  { owner: at('lucas'), title: 'Hut bookings', content: 'Confirm the second night before the end of the month.' },
  { owner: at('maya'), title: 'Tournament dates', content: 'Club rapid on the 12th; the regional open in spring.' },
  { owner: at('noah'), title: 'Interview prep', content: 'Indexes, aggregation pipelines, pagination without COUNT surprises.' },
  { owner: at('zara'), title: 'Library returns', content: 'Two books due Friday; renew the third online.' },
  { owner: at('mia'), title: 'Darkroom chemistry', content: 'Developer 1+9 at 20 C for 7 minutes; agitate the first 30 s, then 10 s each minute.' },
  { owner: at('ava'), title: 'Route ideas', content: 'Coastal path loop; the lake circuit in autumn.' },
  { owner: at('admin'), title: 'Moderation notes', content: 'No reports this week. Check the seed data before a demo.' },
  { owner: at('liam'), title: 'Bug to reproduce', content: 'Only fails with an empty interests array. Write the failing test first.' },
  { owner: at('maya'), title: 'Weekly review', content: 'Two wins, one loss. Spent too long in the opening again.' },
];

export const SEED_POSTS: SeedEntry[] = [
  { owner: at('maya'), title: 'Why I switched to the Caro-Kann', content: 'Solid structures, fewer forced lines to memorise, and endgames I actually enjoy.' },
  { owner: at('liam'), title: 'A beginner-friendly ridge walk', content: 'Fourteen kilometres, well marked, and the views pay for every step of the climb.' },
  { owner: at('sofia'), title: 'Risotto is about patience', content: 'Warm stock, one ladle at a time, and never walk away from the pan.' },
  { owner: at('noah'), title: 'Small tools beat big frameworks', content: 'Most side projects need a single file and a clear idea, not a platform.' },
  { owner: at('ava'), title: 'Shooting in blue hour', content: 'The twenty minutes after sunset are worth more than the whole afternoon.' },
  { owner: at('maya'), title: 'Reviewing your own games', content: 'Write down what you thought before checking the engine. The gap is the lesson.' },
  { owner: at('zara'), title: 'Three novels for a long weekend', content: 'Short, strange and unforgettable: my picks for slow reading.' },
  { owner: at('lucas'), title: 'Packing light for a week', content: 'One bag, layers, and accepting that you will wear the same jumper twice.' },
  { owner: at('mia'), title: 'Developing film at home', content: 'Less equipment than you think, and the first roll is pure magic.' },
  { owner: at('maya'), title: 'Photographing a chess club', content: 'Hands, clocks and concentration: candid shots without the flash.' },
  { owner: at('sofia'), title: 'Florence on a budget', content: 'Walk everywhere, eat lunch as the main meal, and book museums early.' },
  { owner: at('liam'), title: 'Testing the edge cases first', content: 'Empty arrays, missing fields and duplicates find most bugs before users do.' },
  { owner: at('noah'), title: 'What a database index really buys you', content: 'Seeking straight to the rows you need instead of reading all of them.' },
  { owner: at('ava'), title: 'The lake circuit in autumn', content: 'Go early, bring a flask, and expect to stop every hundred metres for photos.' },
  { owner: at('zara'), title: 'A spice blend for everything', content: 'Toast whole seeds first: it is the difference between flat and fragrant.' },
  { owner: at('maya'), title: 'Learning Satie as an adult', content: 'Slow pieces are harder than they look. Every wrong note is audible.' },
  { owner: at('lucas'), title: 'Booking mountain huts', content: 'Reserve early, confirm twice, and always carry cash.' },
  { owner: at('sofia'), title: 'Hosting a dinner for eight', content: 'Cook ahead, keep the starter cold, and ask about allergies before shopping.' },
  { owner: at('liam'), title: 'Splitting a parser in two', content: 'Separate reading from meaning, and each half becomes easy to test.' },
  { owner: at('maya'), title: 'One year of weekly reviews', content: 'Fifty-two short notes taught me more than any course.' },
];
