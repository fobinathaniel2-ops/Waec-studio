/* WAEC Practice Studio: one place to change prices, plan text and contact details.
   Nothing here is a secret. It is public, like the page itself. Secret keys live only in server environment variables. */
window.CONFIG = {
  brand: 'WAEC Practice Studio',
  supportEmail: '',            // e.g. 'help@yourdomain.com'. Leave empty until you have a real support address.
  currency: 'GH₵',
  premiumOpen: false,          // keep false until payments are connected, tested and verified on the server
  plans: [                     // proposed prices, change freely
    { id: 'weekly',  label: 'Weekly',  price: 5,   days: 7 },
    { id: 'monthly', label: 'Monthly', price: 20,  days: 30 },
    { id: 'annual',  label: 'Annual',  price: 180, days: 365 }
  ],
  // What each plan includes. "live" features work today. "planned" features are not built yet and are labelled that way.
  features: [
    { name: 'AI lessons for any subject, topic and class', free: 'live', premium: 'live' },
    { name: 'Exam essentials, formulas and key facts', free: 'live', premium: 'live' },
    { name: 'Most-liked videos for each topic', free: 'live', premium: 'live' },
    { name: 'Practice questions with marking and WAEC grade', free: 'live', premium: 'live' },
    { name: 'Study history and streak on your phone', free: 'live', premium: 'live' },
    { name: 'Higher daily AI allowance', free: false, premium: 'planned' },
    { name: 'Timed mock examinations', free: false, premium: 'planned' },
    { name: 'Detailed performance analytics', free: false, premium: 'planned' },
    { name: 'Study plans and revision packs', free: false, premium: 'planned' }
  ]
};
